import test from 'node:test';
import assert from 'node:assert/strict';
import { TildaEngine } from '../tilda_engine.js';
import { TILDA_BLOCKS } from '../tilda_blocks.js';
import { ZeroBlock, ZeroBlockEditor } from '../zero_block.js';

function createHeadlessEngine() {
  const engine = new TildaEngine({ container: null });
  engine.project = engine.createDefaultProject();
  return engine;
}

test('all built-in project templates reference existing block definitions', () => {
  const engine = createHeadlessEngine();
  const ids = new Set(TILDA_BLOCKS.map(block => block.id));
  const templates = ['landing', 'store', 'portfolio', 'restaurant', 'event', 'education', 'medical', 'realestate', 'blog', 'saas', 'agency', 'about', 'contacts', 'blank'];

  for (const template of templates) {
    for (const block of engine.getTemplateBlocks(template)) {
      assert.ok(ids.has(block.blockDefId), `${template} template references ${block.blockDefId}`);
    }
  }
});

test('duplicating blocks creates fresh block, element and anchor identities', () => {
  const engine = createHeadlessEngine();
  const page = engine.getActivePage();
  const source = page.blocks[1];
  source.anchor = 'hero';
  source.content.customElements = [{ id: 'custom-a', type: 'text', props: { x: 10, y: 20 } }];
  engine.renderArtboard = () => {};
  engine.renderLayersTree = () => {};

  engine.duplicateBlock(source.instanceId);
  const copy = page.blocks[2];

  assert.notEqual(copy.instanceId, source.instanceId);
  assert.equal(copy.anchor, '');
  assert.notEqual(copy.content.customElements[0].id, source.content.customElements[0].id);
});

test('page export preserves CSS units, block backgrounds and min height', () => {
  const engine = createHeadlessEngine();
  const page = engine.getActivePage();
  page.blocks = [engine.createBlockInstance('cover-1')];
  page.blocks[0].design = {
    bgColor: '#123456',
    bgImage: 'https://example.test/cover.png',
    paddingTop: '4rem',
    paddingBottom: 72,
    height: 640
  };

  const html = engine.generatePageHtml(page);
  assert.match(html, /padding-top:4rem/);
  assert.match(html, /padding-bottom:72px/);
  assert.match(html, /min-height:640px/);
  assert.match(html, /background-size:cover/);
  assert.match(html, /background-color:#123456/);
});

test('Zero Block export uses edited elements and includes responsive overrides', () => {
  const engine = createHeadlessEngine();
  const block = engine.createBlockInstance('zero-1');
  block.content.elements = [{
    id: 'export-title',
    type: 'h1',
    props: { x: 120, y: 45, width: 520, height: 80, content: 'Актуальный заголовок', fontSize: 42 },
    responsiveProps: { 480: { x: 18, y: 24, width: 330, fontSize: 28 } }
  }];
  block.content.responsiveSettings = { 480: { height: 520, background: '#112233' } };
  block.design = { height: 720, background: '#070a13' };
  const page = engine.getActivePage();
  page.blocks = [block];

  const html = engine.generatePageHtml(page);
  assert.match(html, /Актуальный заголовок/);
  assert.match(html, /max-width:480px/);
  assert.match(html, /left:18px !important/);
  assert.match(html, /height:520px !important/);
  assert.match(html, /background-color:#112233 !important/);
});

test('Zero Block preserves desktop geometry when editing mobile overrides', () => {
  const block = new ZeroBlock({ elements: [{ id: 'hero-title', type: 'h1', props: { x: 100, y: 80, width: 600, height: 90 } }] });
  const editor = Object.create(ZeroBlockEditor.prototype);
  editor.block = block;
  editor.activeBreakpoint = 480;
  editor.history = [];
  editor.historyIdx = -1;
  editor.container = null;
  editor.getSelectedElement = () => block.elements[0];
  editor.onSelectionChange = null;
  editor.saveHistory = () => {};
  editor.render = () => {};
  editor.getElementProps = ZeroBlockEditor.prototype.getElementProps;
  editor.setElementProps = ZeroBlockEditor.prototype.setElementProps;

  editor.setElementProps(block.elements[0], { x: 24, width: 432 });

  assert.equal(block.elements[0].props.x, 100);
  assert.equal(block.elements[0].props.width, 600);
  assert.deepEqual(block.elements[0].responsiveProps[480], { x: 24, width: 432 });
  assert.equal(editor.getElementProps(block.elements[0]).x, 24);
  assert.equal(editor.getElementProps(block.elements[0], 1200).x, 100);
});

test('Zero Block mobile auto-layout does not modify desktop element props', () => {
  const block = new ZeroBlock({
    settings: { height: 600, gridWidth: 1200 },
    elements: [
      { id: 'title', type: 'h1', props: { x: 160, y: 130, width: 600, height: 90, fontSize: 44 } },
      { id: 'cta', type: 'btn', props: { x: 160, y: 260, width: 240, height: 56 } }
    ]
  });
  const desktop = block.elements.map(element => ({ ...element.props }));
  const editor = Object.create(ZeroBlockEditor.prototype);
  editor.block = block;
  editor.activeBreakpoint = 1200;
  editor.saveHistory = () => {};
  editor.render = () => {};
  editor.onSelectionChange = null;

  editor.autoLayoutMobile(375);

  assert.deepEqual(block.elements.map(element => element.props), desktop);
  assert.ok(block.elements.every(element => element.responsiveProps[375]));
  assert.equal(editor.activeBreakpoint, 375);
});
