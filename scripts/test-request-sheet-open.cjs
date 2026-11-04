const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');
const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync('components/modals/CreateRequestModal.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
vm.runInNewContext(code, { exports: exportsObject, console, document: { body: {} }, setTimeout, clearTimeout, require(name) {
  if (name === 'react') return React;
  if (name === 'react-dom') return { createPortal: child => child };
  if (name === 'lucide-react') return { CarFront: () => null, X: () => null };
  if (name === '../RequestForm') return { __esModule: true, default: () => { throw new Promise(() => {}); } };
  if (name.endsWith('.css')) return {};
  throw Error(name);
} });
const props = { isOpen: true, onClose() {}, existingOrderNumbers: [], currentUser: 'Test' };
const start = performance.now();
const html = renderToString(React.createElement(exportsObject.default, props));
assert.ok(html.includes('role="dialog"'));
assert.ok(html.includes('Yêu cầu ghép xe'));
assert.ok(html.includes('Đóng yêu cầu ghép xe'));
assert.ok(html.includes('Đang tải biểu mẫu'));
assert.equal(renderToString(React.createElement(exportsObject.default, { ...props, isOpen: false })), '');
console.log(`PASS: sheet title, close button and loading state render while form is suspended; closed sheet stays hidden (${Math.round(performance.now() - start)} ms, simulated pending form).`);
for (const file of ['App.tsx', 'components/RequestForm.tsx', 'components/modals/CreateRequestModal.tsx']) {
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
  assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0, file);
}
console.log('PASS: modified app, form and sheet transpile. No live API calls.');
