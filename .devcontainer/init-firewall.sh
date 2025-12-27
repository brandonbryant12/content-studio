#!/bin/bash
#
# Firewall configuration for Continuous Claude Agent
# Restricts network access to only essential services for safety
#
# Based on anthropics/claude-code init-firewall.sh
#

set -euo pipefail
IFS=$'\n\t'

echo "=== Initializing Firewall for Continuous Claude Agent ==="

# 1. Preserve Docker DNS rules before flushing
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

# 2. Restore Docker DNS resolution
if [ -n "$DOCKER_DNS_RULES" ]; then
  echo "Restoring Docker DNS rules..."
  iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
  iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
  echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
else
  echo "No Docker DNS rules to restore"
fi

# 3. Allow essential traffic first
# DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --sport 53 -j ACCEPT

# SSH (for git operations)
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT

# Localhost
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# 4. Create IP allowlist
ipset create allowed-domains hash:net

# 5. Add GitHub IP ranges
echo "Fetching GitHub IP ranges..."
gh_ranges=$(curl -s https://api.github.com/meta)
if [ -z "$gh_ranges" ]; then
  echo "ERROR: Failed to fetch GitHub IP ranges"
  exit 1
fi

if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
  echo "ERROR: GitHub API response missing required fields"
  exit 1
fi

echo "Processing GitHub IPs..."
while read -r cidr; do
  if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
    echo "WARNING: Skipping invalid CIDR: $cidr"
    continue
  fi
  echo "  Adding GitHub range $cidr"
  ipset add allowed-domains "$cidr" 2>/dev/null || true
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | aggregate -q)

# 6. Add other allowed domains
ALLOWED_DOMAINS=(
  # Package registries
  "registry.npmjs.org"
  "registry.yarnpkg.com"

  # Anthropic services
  "api.anthropic.com"
  "sentry.io"
  "statsig.anthropic.com"
  "statsig.com"

  # VS Code extensions
  "marketplace.visualstudio.com"
  "vscode.blob.core.windows.net"
  "update.code.visualstudio.com"

  # Common dev services (add more as needed)
  "api.openai.com"
  "cloudflare.com"

  # Vercel (if using)
  "vercel.com"
  "api.vercel.com"

  # Supabase (if using)
  "supabase.co"
  "supabase.com"
)

for domain in "${ALLOWED_DOMAINS[@]}"; do
  echo "Resolving $domain..."
  ips=$(dig +noall +answer A "$domain" 2>/dev/null | awk '$4 == "A" {print $5}')
  if [ -z "$ips" ]; then
    echo "  WARNING: Failed to resolve $domain (skipping)"
    continue
  fi

  while read -r ip; do
    if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
      echo "  WARNING: Invalid IP for $domain: $ip"
      continue
    fi
    echo "  Adding $ip for $domain"
    ipset add allowed-domains "$ip" 2>/dev/null || true
  done < <(echo "$ips")
done

# 7. Allow host network (for Docker, dev servers, etc.)
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
  echo "WARNING: Failed to detect host IP"
else
  HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
  echo "Host network detected as: $HOST_NETWORK"
  iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
  iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT
fi

# 8. Set default policies to DROP
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# 9. Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 10. Allow traffic to whitelisted IPs
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

# 11. Reject everything else with feedback
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited

echo ""
echo "=== Firewall Configuration Complete ==="
echo ""

# 12. Verification
echo "Verifying firewall rules..."

# Should FAIL - example.com not whitelisted
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
  echo "WARNING: Able to reach example.com - firewall may not be working correctly"
else
  echo "✓ Blocked: example.com (expected)"
fi

# Should SUCCEED - GitHub is whitelisted
if curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
  echo "✓ Allowed: api.github.com (expected)"
else
  echo "WARNING: Unable to reach api.github.com - check firewall rules"
fi

# Should SUCCEED - Anthropic is whitelisted
if curl --connect-timeout 5 https://api.anthropic.com >/dev/null 2>&1; then
  echo "✓ Allowed: api.anthropic.com (expected)"
else
  echo "WARNING: Unable to reach api.anthropic.com - check firewall rules"
fi

echo ""
echo "Firewall is active. Only whitelisted domains are accessible."
echo "To add more domains, edit /usr/local/bin/init-firewall.sh"
