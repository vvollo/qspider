import React, { useRef } from 'react';
import { observable, action, computed, makeObservable, reaction } from 'mobx';
import { extractLayoutData, LayoutDock, LayoutPanel } from './cfg-converter';
import { CfgData, parseCfg } from './cfg-parser';
import { DEFAULT_FLOATING, DEFAULT_LAYOUT } from './defaults';
import { IBaseLayout, IGameManager, IResourceManager, QspGUIPanel } from '@qspider/contracts';
import { useBaseLayout, useGameManager, useResources } from '@qspider/providers';
import { convertColor } from '@qspider/utils';

const classicDefaults = {
  defaultBackgroundColor: '#e0e0e0',
  defaultColor: '#000000',
  defaultLinkColor: '#0000ff',
  defaultFontSize: 12,
  defaultFontName: '',
};

class ClassicLayout {
  gameConfig: CfgData | false = false;
  layout: LayoutDock[] = [];
  floating: [QspGUIPanel, number, number][] = [];

  constructor(private manager: IGameManager, private baseLayout: IBaseLayout, private resources: IResourceManager) {
    makeObservable(this, {
      gameConfig: observable,
      layout: observable,
      floating: observable,

      visibleLayout: computed,
      floatingPanels: computed,
    });
    this.initialized(manager);
  }

  async initialized(manager: IGameManager): Promise<void> {
    await manager.apiInitialized;
    reaction(
      () => this.manager.currentGame,
      async (descriptor) => {
        if (!descriptor) return;
        try {
          const text = await this.resources.getTextContent('qspgui.cfg');
          this.gameConfig = parseCfg(text);
        } catch (_) {
          this.gameConfig = false;
        }
        if (this.gameConfig) {
          const { layout, floating } = extractLayoutData(this.gameConfig);
          this.layout = layout;
          this.floating = floating;
        } else {
          this.layout = DEFAULT_LAYOUT;
          this.floating = DEFAULT_FLOATING;
          this.fillClassicDefaults();
        }
      }
    );
  }

  fillDefaultsFromConfig(config: CfgData): void {
    const defaults = { ...classicDefaults };
    if (config) {
      if (config.Colors) {
        defaults.defaultBackgroundColor = convertColor(config.Colors.BackColor, false);
        defaults.defaultColor = convertColor(config.Colors.FontColor, false);
        defaults.defaultLinkColor = convertColor(config.Colors.LinkColor, false);
      }
      if (config.Font) {
        defaults.defaultFontName = config.Font.FontName;
        defaults.defaultFontSize = config.Font.FontSize;
      }
    }
    this.baseLayout.fillDefaults(defaults);
  }

  fillClassicDefaults(): void {
    this.baseLayout.fillDefaults(classicDefaults);
  }

  get visibleLayout(): LayoutDock[] {
    return this.layout.map(this.processDock).filter((d): d is LayoutDock => Boolean(d));
  }

  get floatingPanels(): [string, number, number][] {
    return this.floating.filter(([name]) => this.isPanelVisible(name));
  }

  processDock = (dock: LayoutDock): LayoutDock | null => {
    if ((dock[0] as QspGUIPanel) === QspGUIPanel.Main) {
      return dock;
    }
    if (dock[0] === 'center') {
      return [
        dock[0],
        dock[1],
        (dock[2] as LayoutDock[]).map(this.processDock).filter((d): d is LayoutDock => Boolean(d)),
      ];
    }
    const filteredChildren = this.filterPanels(dock[2] as LayoutPanel[]);
    if (filteredChildren && filteredChildren.length > 0) {
      return [dock[0], dock[1], filteredChildren];
    }
    return null;
  };

  filterPanels = (panels: LayoutPanel[]): LayoutPanel[] => {
    return panels && panels.filter(([name]) => this.isPanelVisible(name));
  };

  isPanelVisible(name: QspGUIPanel): boolean {
    switch (name) {
      case QspGUIPanel.Actions:
        return this.baseLayout.isActionsPanelVisible;
      case QspGUIPanel.ImageView:
        return this.manager.isViewShown;
      case QspGUIPanel.Objects:
        return this.baseLayout.isObjectPanelVisible;
      case QspGUIPanel.Stats:
        return this.baseLayout.isStatsPanelVisible;
      case QspGUIPanel.Input:
        return this.baseLayout.isUserInputPanelVisible;
    }
    return true;
  }
}

const classicLayoutContext = React.createContext<ClassicLayout | null>(null);

export const LayoutProvider: React.FC = ({ children }) => {
  const manager = useGameManager();
  const resources = useResources();
  const baseLayout = useBaseLayout();
  const layout = useRef(new ClassicLayout(manager, baseLayout, resources));
  return <classicLayoutContext.Provider value={layout.current}>{children}</classicLayoutContext.Provider>;
};

export const useClassicLayout = (): ClassicLayout => {
  const layout = React.useContext(classicLayoutContext);
  if (!layout) {
    // this is especially useful in TypeScript so you don't need to be checking for null all the time
    throw new Error('useLayout must be used within a StoreProvider.');
  }
  return layout;
};
