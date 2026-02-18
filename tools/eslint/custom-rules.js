// @ts-nocheck

const isIdentifierNamed = (node, name) =>
  node?.type === 'Identifier' && node.name === name;

const isStringLiteral = (node, value) =>
  node?.type === 'Literal' && node.value === value;

const getObjectProperty = (objectExpression, keyName) => {
  if (objectExpression?.type !== 'ObjectExpression') return undefined;

  return objectExpression.properties.find(
    (property) =>
      property.type === 'Property' &&
      ((property.key.type === 'Identifier' && property.key.name === keyName) ||
        (property.key.type === 'Literal' && property.key.value === keyName)),
  );
};

const noUnknownChatStreamContract = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow eventIterator(type<unknown>()) for chat stream contracts.',
    },
    schema: [],
    messages: {
      noUnknown:
        'Use a concrete stream chunk type (for chat: UIMessageChunk), not unknown.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isIdentifierNamed(node.callee, 'eventIterator')) return;

        const firstArg = node.arguments[0];
        if (firstArg?.type !== 'CallExpression') return;
        if (!isIdentifierNamed(firstArg.callee, 'type')) return;

        const firstTypeArg = firstArg.typeArguments?.params?.[0];
        if (firstTypeArg?.type === 'TSUnknownKeyword') {
          context.report({ node: firstTypeArg, messageId: 'noUnknown' });
        }
      },
    };
  },
};

const noChatStatusNotReady = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `status !== \"ready\"` style checks in chat hooks.',
    },
    schema: [],
    messages: {
      explicitStreaming:
        'Use explicit streaming checks: status === "submitted" || status === "streaming".',
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        if (node.operator !== '!==' && node.operator !== '!=') return;

        const leftStatusReady =
          isIdentifierNamed(node.left, 'status') &&
          isStringLiteral(node.right, 'ready');
        const rightStatusReady =
          isIdentifierNamed(node.right, 'status') &&
          isStringLiteral(node.left, 'ready');

        if (leftStatusReady || rightStatusReady) {
          context.report({ node, messageId: 'explicitStreaming' });
        }
      },
    };
  },
};

const noInlineInvalidateQueryKeyArray = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow inline array literals for invalidateQueries({ queryKey: ... }).',
    },
    schema: [],
    messages: {
      useQueryKeyHelper:
        'Use an exported query-key helper (derived from queryOptions().queryKey), not an inline array literal.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        if (!isIdentifierNamed(node.callee.property, 'invalidateQueries'))
          return;

        const firstArg = node.arguments[0];
        if (firstArg?.type !== 'ObjectExpression') return;

        const queryKeyProp = getObjectProperty(firstArg, 'queryKey');
        if (!queryKeyProp || queryKeyProp.type !== 'Property') return;

        if (queryKeyProp.value.type === 'ArrayExpression') {
          context.report({
            node: queryKeyProp.value,
            messageId: 'useQueryKeyHelper',
          });
        }
      },
    };
  },
};

const customRules = {
  rules: {
    'no-unknown-chat-stream-contract': noUnknownChatStreamContract,
    'no-chat-status-not-ready': noChatStatusNotReady,
    'no-inline-invalidate-querykey-array': noInlineInvalidateQueryKeyArray,
  },
};

export default customRules;
