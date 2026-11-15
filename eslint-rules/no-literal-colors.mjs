/**
 * Local rule `no-literal-colors`.
 *
 * Reports string literals and template elements that contain a literal colour
 * value: a hex colour (`#` followed by 3, 4, 6 or 8 hex digits) or a call to
 * `rgb(`, `rgba(`, `hsl(`, `hsla(` or `oklch(`. The match runs inside longer
 * strings, so Tailwind arbitrary values such as `bg-[#fff]` are caught.
 * `var(--token)` references pass.
 */

const COLOR_PATTERN =
  /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b|\b(?:rgba?|hsla?|oklch)\(/i;

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      literalColor:
        'Literal colour "{{match}}" is not allowed. Use a design token from globals.css (for example a Tailwind token class or var(--token)).',
    },
  },
  create(context) {
    const { sourceCode } = context;

    /** @param {import('estree').Node} node */
    function check(node) {
      const text = sourceCode.getText(node);
      const found = COLOR_PATTERN.exec(text);
      if (!found) return;
      context.report({
        node,
        loc: sourceCode.getLocFromIndex(node.range[0] + found.index),
        messageId: 'literalColor',
        data: { match: found[0] },
      });
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node);
      },
      TemplateElement: check,
    };
  },
};

export default rule;
