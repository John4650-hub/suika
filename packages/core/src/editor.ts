import {
  genId,
  sceneCoordsToViewportUtil,
  viewportCoordsToSceneUtil,
} from '@suika/common';

import { CanvasDragger } from './canvas_dragger';
import { ClipboardManager } from './clipboard';
import { CommandManager } from './commands/command_manager';
import { ControlHandleManager } from './control_handle_manager';
import { CursorManger, ICursor } from './cursor_manager';
import { GraphAttrs } from './graphs';
import { GroupManager } from './group_manager';
import { HostEventManager } from './host_event_manager';
import { ImgManager } from './Img_manager';
import { KeyBindingManager } from './key_binding_manager';
import { PerfMonitor } from './perf_monitor';
import { RefLine } from './ref_line';
import Ruler from './ruler';
import { SceneGraph } from './scene/scene_graph';
import { SelectedBox } from './selected_box';
import SelectedElements from './selected_elements';
import { Setting } from './setting';
import { AutoSaveGraphs } from './store/auto-save-graphs';
import { TextEditor } from './text/text_editor';
import { ToolManager } from './tools/tool_manager';
import { IEditorPaperData } from './type';
import { ViewportManager } from './viewport_manager';
import { ZoomManager } from './zoom_manager';

interface IEditorOptions {
  containerElement: HTMLDivElement;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  showPerfMonitor?: boolean;
}

export class Editor {
  containerElement: HTMLDivElement;
  canvasElement: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  appVersion = 'suika-editor_0.0.1';
  paperId: string;

  sceneGraph: SceneGraph;
  controlHandleManager: ControlHandleManager;
  groupManager: GroupManager;

  setting: Setting;

  viewportManager: ViewportManager;

  canvasDragger: CanvasDragger;
  toolManager: ToolManager;
  commandManager: CommandManager;
  zoomManager: ZoomManager;
  imgManager: ImgManager;

  cursorManager: CursorManger;
  keybindingManager: KeyBindingManager;
  hostEventManager: HostEventManager;
  clipboard: ClipboardManager;

  selectedElements: SelectedElements;
  selectedBox: SelectedBox;
  ruler: Ruler;
  refLine: RefLine;
  textEditor: TextEditor;

  autoSaveGraphs: AutoSaveGraphs;
  perfMonitor: PerfMonitor;

  constructor(options: IEditorOptions) {
    this.containerElement = options.containerElement;
    this.canvasElement = document.createElement('canvas');
    this.containerElement.appendChild(this.canvasElement);
    this.ctx = this.canvasElement.getContext('2d')!;

    this.setting = new Setting();
    if (options.offsetX) {
      this.setting.set('offsetX', options.offsetX);
    }
    if (options.offsetY) {
      this.setting.set('offsetY', options.offsetY);
    }

    this.keybindingManager = new KeyBindingManager(this);
    this.keybindingManager.bindEvent();

    this.sceneGraph = new SceneGraph(this);
    this.groupManager = new GroupManager(this);

    this.cursorManager = new CursorManger(this);
    this.viewportManager = new ViewportManager(this);

    this.commandManager = new CommandManager(this);
    this.zoomManager = new ZoomManager(this);
    this.imgManager = new ImgManager();

    this.selectedElements = new SelectedElements(this);
    this.selectedBox = new SelectedBox(this);
    this.ruler = new Ruler(this);
    this.refLine = new RefLine(this);
    this.textEditor = new TextEditor(this);

    this.controlHandleManager = new ControlHandleManager(this);
    this.controlHandleManager.bindEvents();

    this.hostEventManager = new HostEventManager(this);
    this.hostEventManager.bindHotkeys();

    this.canvasDragger = new CanvasDragger(this);
    this.toolManager = new ToolManager(this);

    this.clipboard = new ClipboardManager(this);
    this.clipboard.bindEvents();

    this.autoSaveGraphs = new AutoSaveGraphs(this);

    this.imgManager.eventEmitter.on('added', () => {
      this.sceneGraph.render();
    });

    const data = this.autoSaveGraphs.load();
    if (data) {
      this.loadData(data);
    }
    this.paperId ??= genId();
    this.autoSaveGraphs.autoSave();

    // 设置初始视口
    this.viewportManager.setViewport({
      x: -options.width / 2,
      y: -options.height / 2,
      width: options.width,
      height: options.height,
    });

    this.zoomManager.zoomToFit(1);

    this.perfMonitor = new PerfMonitor();
    if (options.showPerfMonitor) {
      this.perfMonitor.start(this.containerElement);
    }

    /**
     * setViewport 其实会修改 canvas 的宽高，浏览器的 DOM 更新是异步的，
     * 所以下面的 render 要异步执行
     */
    Promise.resolve().then(() => {
      this.sceneGraph.render();
    });
  }
  loadData(data: IEditorPaperData) {
    if (data.groups) {
      this.groupManager.load(data.groups);
    }
    this.sceneGraph.load(data.data);
    this.commandManager.clearRecords();
    this.paperId = data.paperId;
    this.paperId ??= genId();
  }
  destroy() {
    this.containerElement.removeChild(this.canvasElement);
    this.textEditor.destroy();
    this.keybindingManager.destroy();
    this.hostEventManager.destroy();
    this.clipboard.destroy();
    this.canvasDragger.destroy();
    this.toolManager.unbindEvent();
    this.toolManager.destroy();
    this.perfMonitor.destroy();
    this.controlHandleManager.unbindEvents();
  }
  setCursor(cursor: ICursor) {
    this.cursorManager.setCursor(cursor);
  }
  getCursor() {
    return this.cursorManager.getCursor();
  }
  /**
   * viewport coords to scene coords
   *
   * reference: https://mp.weixin.qq.com/s/uvVXZKIMn1bjVZvUSyYZXA
   */
  viewportCoordsToScene(x: number, y: number, round = false) {
    const zoom = this.zoomManager.getZoom();
    const { x: scrollX, y: scrollY } = this.viewportManager.getViewport();
    return viewportCoordsToSceneUtil(x, y, zoom, scrollX, scrollY, round);
  }
  sceneCoordsToViewport(x: number, y: number) {
    const zoom = this.zoomManager.getZoom();
    const { x: scrollX, y: scrollY } = this.viewportManager.getViewport();
    return sceneCoordsToViewportUtil(x, y, zoom, scrollX, scrollY);
  }
  /** get cursor viewport xy */
  getCursorXY(event: { clientX: number; clientY: number }) {
    return {
      x: event.clientX - this.setting.get('offsetX'),
      y: event.clientY - this.setting.get('offsetY'),
    };
  }
  /** get cursor scene xy */
  getSceneCursorXY(event: { clientX: number; clientY: number }, round = false) {
    const { x, y } = this.getCursorXY(event);
    return this.viewportCoordsToScene(x, y, round);
  }
  moveElements(elements: GraphAttrs[], dx: number, dy: number) {
    for (const element of elements) {
      element.x += dx;
      element.y += dy;
    }
  }
}
