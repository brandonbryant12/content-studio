/**
 * Voiceover Collaboration E2E Tests
 *
 * Tests for collaboration features:
 * - Add collaborator by email
 * - Approve voiceover as owner
 * - Remove collaborator
 */

import { authenticatedTest, expect } from '../../fixtures';

// Generate unique voiceover name for each test run to avoid conflicts
const uniqueVoiceoverName = () =>
  `CollabTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Test collaborator email
const TEST_COLLABORATOR_EMAIL = 'collaborator@example.com';

authenticatedTest.describe('Voiceover Collaboration', () => {
  authenticatedTest.beforeEach(async ({ api }) => {
    // Clean up voiceovers before each test
    await api.deleteAllVoiceovers();
  });

  authenticatedTest.afterEach(async ({ api }) => {
    // Clean up after each test
    await api.deleteAllVoiceovers();
  });

  // ============================================================================
  // Add Collaborator Tests
  // ============================================================================

  authenticatedTest.describe('Add Collaborator', () => {
    authenticatedTest(
      'shows collaborator avatars in workbench header',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Collaborator avatars should be visible (at least owner)
        await expect(voiceoversPage.getCollaboratorAvatars()).toBeVisible();
      },
    );

    authenticatedTest(
      'can open add collaborator dialog',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Open the collaborator dialog
        await voiceoversPage.openCollaboratorDialog();

        // Dialog should be visible
        await expect(page.getByRole('dialog')).toBeVisible();
      },
    );

    authenticatedTest(
      'can add collaborator by email',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Open the collaborator dialog
        await voiceoversPage.openCollaboratorDialog();

        // Add a collaborator
        await voiceoversPage.addCollaborator(TEST_COLLABORATOR_EMAIL);

        // Collaborator should appear in the list
        await voiceoversPage.openCollaboratorDialog();
        await voiceoversPage.expectCollaboratorVisible(TEST_COLLABORATOR_EMAIL);
      },
    );

    authenticatedTest(
      'validates email format',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Open the collaborator dialog
        await voiceoversPage.openCollaboratorDialog();

        // Click add button to open add dialog
        const addButton = page.getByRole('button', { name: /add/i });
        await addButton.click();

        // Wait for add collaborator dialog
        await expect(voiceoversPage.getAddCollaboratorDialog()).toBeVisible();

        // Enter invalid email
        const emailInput = page.getByLabel(/email/i);
        await emailInput.fill('invalid-email');
        await emailInput.blur();

        // Should show validation error
        await expect(
          page.getByText(/please enter a valid email/i),
        ).toBeVisible();

        // Send Invite button should be disabled
        const submitButton = page.getByRole('button', { name: /send invite/i });
        await expect(submitButton).toBeDisabled();
      },
    );

    authenticatedTest(
      'shows pending status for collaborator without account',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Add a collaborator who doesn't have an account
        const pendingEmail = 'pending-user@example.com';
        await voiceoversPage.openCollaboratorDialog();
        await voiceoversPage.addCollaborator(pendingEmail);

        // Open dialog again to verify
        await voiceoversPage.openCollaboratorDialog();

        // Should show "Pending" badge
        await expect(page.getByText(/pending/i)).toBeVisible();
      },
    );
  });

  // ============================================================================
  // Approve Voiceover Tests
  // ============================================================================

  authenticatedTest.describe('Approve Voiceover', () => {
    authenticatedTest(
      'shows Approve button for owner',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Approve button should be visible
        await expect(voiceoversPage.getApproveButton()).toBeVisible();
      },
    );

    authenticatedTest(
      'owner can approve voiceover',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Initially not approved
        await voiceoversPage.expectNotApproved();

        // Click approve
        await voiceoversPage.clickApprove();

        // Should now show "Approved"
        await voiceoversPage.expectApproved();
      },
    );

    authenticatedTest(
      'owner can revoke approval',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API and approve it
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });
        await api.approveVoiceover(voiceover.id);

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Should show "Approved"
        await voiceoversPage.expectApproved();

        // Click to revoke
        await voiceoversPage.clickApprove();

        // Should now show "Approve" (not approved)
        await voiceoversPage.expectNotApproved();
      },
    );

    authenticatedTest(
      'approval status is shown in collaborator list',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover and approve as owner
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });
        await api.approveVoiceover(voiceover.id);

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Open collaborator dialog
        await voiceoversPage.openCollaboratorDialog();

        // Owner should show "Approved" status
        await expect(
          voiceoversPage.getCollaboratorList().getByText(/approved/i),
        ).toBeVisible();
      },
    );

    authenticatedTest(
      'approval badge appears on owner avatar when approved',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Initially no approval badge
        const approvalBadge = page.locator('.collab-list-approved-badge');

        // Approve the voiceover
        await voiceoversPage.clickApprove();

        // Open dialog to check badge
        await voiceoversPage.openCollaboratorDialog();

        // Approval badge should be visible on owner
        await expect(approvalBadge.first()).toBeVisible();
      },
    );
  });

  // ============================================================================
  // Remove Collaborator Tests
  // ============================================================================

  authenticatedTest.describe('Remove Collaborator', () => {
    authenticatedTest(
      'owner can remove collaborator',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        // Add a collaborator via API
        await api.addVoiceoverCollaborator(
          voiceover.id,
          TEST_COLLABORATOR_EMAIL,
        );

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Open collaborator dialog
        await voiceoversPage.openCollaboratorDialog();

        // Collaborator should be visible
        await voiceoversPage.expectCollaboratorVisible(TEST_COLLABORATOR_EMAIL);

        // Remove the collaborator
        await voiceoversPage.removeCollaborator(TEST_COLLABORATOR_EMAIL);

        // Wait for removal
        await page.waitForTimeout(500);

        // Collaborator should no longer be visible
        await expect(
          voiceoversPage.getCollaboratorList().getByText(TEST_COLLABORATOR_EMAIL),
        ).not.toBeVisible();
      },
    );

    authenticatedTest(
      'owner cannot be removed from collaborator list',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Open collaborator dialog
        await voiceoversPage.openCollaboratorDialog();

        // Owner row should not have remove button
        const ownerRow = page
          .locator('.collab-list-row')
          .filter({ hasText: /owner/i });
        const removeButton = ownerRow.getByRole('button', { name: /remove/i });

        // Remove button should not exist for owner
        await expect(removeButton).not.toBeVisible();
      },
    );

    authenticatedTest(
      'shows confirmation or removes immediately',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        // Add a collaborator via API
        const collaborator = await api.addVoiceoverCollaborator(
          voiceover.id,
          'remove-test@example.com',
        );

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Open collaborator dialog
        await voiceoversPage.openCollaboratorDialog();

        // Remove the collaborator
        await voiceoversPage.removeCollaborator('remove-test@example.com');

        // After removal, collaborator should be gone
        await expect(
          voiceoversPage.getCollaboratorList().getByText('remove-test@example.com'),
        ).not.toBeVisible({ timeout: 5000 });
      },
    );
  });

  // ============================================================================
  // Collaborator Display Tests
  // ============================================================================

  authenticatedTest.describe('Collaborator Display', () => {
    authenticatedTest(
      'shows owner with crown badge in collaborator list',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Open collaborator dialog
        await voiceoversPage.openCollaboratorDialog();

        // Owner badge should be visible
        await expect(page.locator('.collab-list-owner-badge').first()).toBeVisible();

        // Owner role badge text
        await expect(page.getByText(/owner/i).first()).toBeVisible();
      },
    );

    authenticatedTest(
      'shows empty state when no collaborators',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Open collaborator dialog
        await voiceoversPage.openCollaboratorDialog();

        // Should show "No collaborators yet" (owner is always shown, this refers to actual collaborators)
        await expect(page.getByText(/no collaborators yet/i)).toBeVisible();
      },
    );

    authenticatedTest(
      'shows multiple collaborators in avatars stack',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({ title });

        // Add multiple collaborators via API
        await api.addVoiceoverCollaborator(voiceover.id, 'collab1@example.com');
        await api.addVoiceoverCollaborator(voiceover.id, 'collab2@example.com');

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Collaborator avatars component should show multiple avatars
        const avatars = voiceoversPage.getCollaboratorAvatars();
        await expect(avatars).toBeVisible();

        // Open dialog to verify all collaborators
        await voiceoversPage.openCollaboratorDialog();
        await voiceoversPage.expectCollaboratorVisible('collab1@example.com');
        await voiceoversPage.expectCollaboratorVisible('collab2@example.com');
      },
    );
  });
});
