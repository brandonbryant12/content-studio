// @ts-nocheck

const isIdentifierNamed = (node, name) =>
  node?.type === 'Identifier' && node.name === name;

const isMemberExpressionNamed = (node, objectName, propertyName) =>
  node?.type === 'MemberExpression' &&
  node.computed === false &&
  isIdentifierNamed(node.object, objectName) &&
  isIdentifierNamed(node.property, propertyName);

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

const unwrapExpression = (node) => {
  let current = node;

  while (current) {
    if (
      current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'ParenthesizedExpression' ||
      current.type === 'ChainExpression'
    ) {
      current = current.expression;
      continue;
    }

    break;
  }

  return current;
};

const isDirectConstructionExpression = (node) => {
  const expression = unwrapExpression(node);

  return (
    expression?.type === 'CallExpression' ||
    expression?.type === 'NewExpression'
  );
};

const findInlineConstructionInObject = (node) => {
  const expression = unwrapExpression(node);
  if (expression?.type !== 'ObjectExpression') return null;

  for (const property of expression.properties) {
    if (property.type === 'SpreadElement') {
      if (isDirectConstructionExpression(property.argument)) {
        return unwrapExpression(property.argument);
      }
      continue;
    }

    if (property.type !== 'Property') continue;
    if (property.kind !== 'init') continue;

    const propertyValue = unwrapExpression(property.value);
    if (
      propertyValue?.type === 'FunctionExpression' ||
      propertyValue?.type === 'ArrowFunctionExpression'
    ) {
      continue;
    }

    if (isDirectConstructionExpression(propertyValue)) {
      return propertyValue;
    }
  }

  return null;
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
        'Disallow `status !== "ready"` style checks in chat hooks.',
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

const noThrowInEffectGen = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow throw statements directly inside Effect.gen generators.',
    },
    schema: [],
    messages: {
      noThrowInGen:
        'Do not throw inside Effect.gen. Use Effect.fail(...) for typed failures or Effect.die(...) for defects.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const getAncestors = (node) =>
      typeof sourceCode.getAncestors === 'function'
        ? sourceCode.getAncestors(node)
        : context.getAncestors();

    const isEffectGenCall = (node) =>
      node?.type === 'CallExpression' &&
      isMemberExpressionNamed(node.callee, 'Effect', 'gen');

    return {
      ThrowStatement(node) {
        const ancestors = getAncestors(node);
        const nearestFunction = [...ancestors]
          .reverse()
          .find(
            (ancestor) =>
              ancestor.type === 'FunctionExpression' ||
              ancestor.type === 'FunctionDeclaration' ||
              ancestor.type === 'ArrowFunctionExpression',
          );

        if (!nearestFunction) return;
        if (nearestFunction.type !== 'FunctionExpression') return;
        if (nearestFunction.generator !== true) return;

        const callExpression = nearestFunction.parent;
        if (!isEffectGenCall(callExpression)) return;

        context.report({ node, messageId: 'noThrowInGen' });
      },
    };
  },
};

const noLayerSucceedConstruction = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow direct factory or constructor work inside Layer.succeed service values.',
    },
    schema: [],
    messages: {
      noInlineConstruction:
        'Layer.succeed must receive a pure object literal or already-constructed plain value. Use Layer.sync(...) for constructors/factories or Layer.effect(...) when construction depends on other services.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isMemberExpressionNamed(node.callee, 'Layer', 'succeed')) return;

        const serviceArg = node.arguments[1];
        if (!serviceArg) return;

        const directConstruction = isDirectConstructionExpression(serviceArg)
          ? unwrapExpression(serviceArg)
          : findInlineConstructionInObject(serviceArg);

        if (!directConstruction) return;

        context.report({
          node: directConstruction,
          messageId: 'noInlineConstruction',
        });
      },
    };
  },
};

const noInstanceofInEffectTests = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow toBeInstanceOf assertions in Effect-oriented use-case tests.',
    },
    schema: [],
    messages: {
      noInstanceof:
        'Use tagged error assertions (error._tag and error fields) instead of toBeInstanceOf(...) in Effect use-case tests.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee?.type !== 'MemberExpression') return;
        if (!isIdentifierNamed(node.callee.property, 'toBeInstanceOf')) return;

        context.report({ node, messageId: 'noInstanceof' });
      },
    };
  },
};

const ALLOWED_INSTANCEOF_CLASSES = new Set(['URL', 'Buffer', 'AbortSignal']);

const noErrorInstanceofInBackendTests = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow toBeInstanceOf for tagged error assertions in backend tests.',
    },
    schema: [],
    messages: {
      noErrorInstanceof:
        'For tagged errors, assert `_tag` and fields instead of toBeInstanceOf(...).',
    },
  },
  create(context) {
    const getClassName = (node) => {
      if (!node) return null;
      if (node.type === 'Identifier') return node.name;
      if (
        node.type === 'MemberExpression' &&
        node.computed === false &&
        node.property.type === 'Identifier'
      ) {
        return node.property.name;
      }
      return null;
    };

    return {
      CallExpression(node) {
        if (node.callee?.type !== 'MemberExpression') return;
        if (!isIdentifierNamed(node.callee.property, 'toBeInstanceOf')) return;

        const className = getClassName(node.arguments[0]);
        if (!className) return;
        if (ALLOWED_INSTANCEOF_CLASSES.has(className)) return;

        context.report({ node, messageId: 'noErrorInstanceof' });
      },
    };
  },
};

const customRules = {
  rules: {
    'no-unknown-chat-stream-contract': noUnknownChatStreamContract,
    'no-chat-status-not-ready': noChatStatusNotReady,
    'no-inline-invalidate-querykey-array': noInlineInvalidateQueryKeyArray,
    'no-layer-succeed-construction': noLayerSucceedConstruction,
    'no-throw-in-effect-gen': noThrowInEffectGen,
    'no-instanceof-in-effect-tests': noInstanceofInEffectTests,
    'no-error-instanceof-in-backend-tests': noErrorInstanceofInBackendTests,
  },
};

export default customRules;
