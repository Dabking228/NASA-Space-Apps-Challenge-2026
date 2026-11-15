/**
 * Local rule `no-unjustified-style`.
 *
 * Reports a JSX `style` attribute unless both hold:
 * 1. the value is computed at runtime (not a plain static value and not an
 *    object literal made only of static values), and
 * 2. a comment ends on the line directly above the attribute.
 */

/**
 * True when the node can be known without running the code.
 * @param {any} node
 * @returns {boolean}
 */
function isStatic(node) {
  switch (node.type) {
    case 'Literal':
      return true;
    case 'TemplateLiteral':
      return node.expressions.length === 0;
    case 'UnaryExpression':
      return isStatic(node.argument);
    case 'ArrayExpression':
      return node.elements.every(
        (element) => element !== null && isStatic(element),
      );
    case 'ObjectExpression':
      return node.properties.every(
        (property) =>
          property.type === 'Property' &&
          !property.computed &&
          isStatic(property.value),
      );
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
      return isStatic(node.expression);
    default:
      return false;
  }
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      staticStyle:
        'Static `style` attribute is not allowed. Use Tailwind utility classes or design tokens.',
      missingComment:
        'A `style` attribute needs a comment on the line directly above explaining why the value is dynamic.',
    },
  },
  create(context) {
    const { sourceCode } = context;

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') {
          return;
        }

        const { value } = node;
        const isRuntime =
          value !== null &&
          value.type === 'JSXExpressionContainer' &&
          value.expression.type !== 'JSXEmptyExpression' &&
          !isStatic(value.expression);

        if (!isRuntime) {
          context.report({ node, messageId: 'staticStyle' });
          return;
        }

        const lineAbove = node.loc.start.line - 1;
        const hasComment = sourceCode
          .getAllComments()
          .some((comment) => comment.loc.end.line === lineAbove);

        if (!hasComment) {
          context.report({ node, messageId: 'missingComment' });
        }
      },
    };
  },
};

export default rule;
