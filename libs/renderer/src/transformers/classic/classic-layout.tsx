import {
  DockPlace,
  isActsVisible$,
  isCmdVisible$,
  isObjsVisible$,
  isStatsVisible$,
  qspGuiCfg$,
  view$,
} from '@qspider/game-state';
import { convertColor, getContrastColor, invertColor } from '@qspider/utils';
import { useAtom, useSetup } from '@xoid/react';
import React, { isValidElement } from 'react';
import { Atom, atom } from 'xoid';
import { qspGuiLayout$ } from '../../render-state';
import { Markup } from '@qspider/html-renderer';

interface DockData {
  visibility: string | null;
  size: number;
}

export const QspCL: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const layoutOverride = useAtom(qspGuiLayout$);
  if (layoutOverride) {
    return (
      <qsp-cl>
        <Markup content={layoutOverride} />
      </qsp-cl>
    );
  }
  return <qsp-cl>{children}</qsp-cl>;
};

export const QspCLLayer: React.FC<{ children: React.ReactNode }> = (props) => {
  const style$ = useSetup(($props) => {
    const children$ = $props?.focus((p) => p.children);
    const docks$ = atom((get) => {
      const docks: Record<string, DockData> = {};
      React.Children.forEach(get(children$), (child) => {
        if (isValidElement(child) && child.type === QspCLDock) {
          docks[child.props.place] = {
            visibility: child.props.visibility,
            size: child.props.size,
          };
        }
      });
      return docks;
    });
    const visibleDocks$ = atom((get) => {
      const docks = get(docks$);
      const visibleDocks: Record<string, DockData> = {};
      for (const [place, data] of Object.entries(docks)) {
        const isVisible =
          data.visibility?.split('|').some((type) => {
            const atom = penelAtoms[type];
            return atom ? get(atom) : false;
          }) ?? true;
        if (isVisible) visibleDocks[place] = data;
      }
      return visibleDocks;
    });
    return atom<React.CSSProperties>((get) => {
      const docks = get(visibleDocks$);
      const areas = ['center'];
      let columns = '1fr';
      let columnsNumber = 1;
      let rows = '1fr';
      if (docks['left']) {
        areas[0] = 'left ' + areas[0];
        columnsNumber++;
        columns = `${docks['left'].size}px ` + columns;
      }
      if (docks['right']) {
        areas[0] += ' right';
        columnsNumber++;
        columns += ` ${docks['right'].size}px`;
      }
      if (docks['top']) {
        rows = `${docks['top'].size}px ` + rows;
        areas.unshift('top '.repeat(columnsNumber).trim());
      }
      if (docks['bottom']) {
        rows += ` ${docks['bottom'].size}px`;
        areas.push('bottom '.repeat(columnsNumber).trim());
      }
      return {
        gridTemplateColumns: columns,
        gridTemplateRows: rows,
        gridTemplateAreas: '"' + areas.join('" "') + '"',
      };
    });
  }, props);
  const style = useAtom(style$);
  return <qsp-cl-layer style={style}>{props.children}</qsp-cl-layer>;
};

const penelAtoms: Record<string, Atom<boolean>> = {
  input: isCmdVisible$,
  imgview: view$.focus((s) => s.isOpen),
  objs: isObjsVisible$,
  acts: isActsVisible$,
  vars: isStatsVisible$,
};

export const QspCLDock: React.FC<
  DockData & {
    place: DockPlace;
    children: React.ReactNode;
  }
> = (props) => {
  const visibility$ = useSetup((props$) => {
    return atom((get) => {
      const visibility$ = props$.focus((s) => s.visibility);
      const visibility: string | null = get(visibility$);
      if (!visibility) return true;
      return visibility.split('|').some((type) => {
        const atom = penelAtoms[type];
        return atom ? get(atom) : false;
      });
    });
  }, props);
  const visibility = useAtom(visibility$);
  if (!visibility) return null;
  return <qsp-cl-dock data-place={props.place}>{props.children}</qsp-cl-dock>;
};

export const QspCLPane: React.FC<{ proportion: number; children: React.ReactNode; visibility: string | null }> = (
  props,
) => {
  const visibility$ = useSetup((props$) => {
    return atom((get) => {
      const visibility$ = props$.focus((s) => s.visibility);
      const visibility: string | null = get(visibility$);
      if (!visibility) return true;
      const atom = penelAtoms[visibility];
      return atom ? get(atom) : false;
    });
  }, props);
  const visibility = useAtom(visibility$);
  if (!visibility) return null;
  return <qsp-cl-pane style={{ flexGrow: props.proportion }}>{props.children}</qsp-cl-pane>;
};

export const QspCLDefaults: React.FC = () => {
  const config = useAtom(qspGuiCfg$);
  if (!config) return null;
  const rules: string[] = [];
  if (config.BackColor) {
    const color = convertColor(config.BackColor, false);
    if (color) {
      const inverted = invertColor(color);
      rules.push(`--cl-background-color: ${color}`);
      rules.push(`--cl-background-color-contrast: ${getContrastColor(color)}`);
      rules.push(`--cl-background-color-inverted: ${inverted}`);
      rules.push(`--cl-background-color-inverted-contrast: ${getContrastColor(inverted)}`);
    }
  }
  if (config.FontColor) {
    const color = convertColor(config.FontColor, false);
    if (color) {
      rules.push(`--cl-color: ${color}`);
    }
  }
  if (config.LinkColor) {
    const color = convertColor(config.LinkColor, false);
    if (color) {
      rules.push(`--cl-link-color: ${color}`);
    }
  }
  if (config.FontSize) {
    rules.push(`--cl-font-size: ${config.FontSize}pt`);
  }
  if (config.FontName) {
    rules.push(`--cl-font-name: ${config.FontName}`);
  }
  const style = `qsp-game-root, #portal-container {${rules.join(';')}}`;
  return <style>{style}</style>;
};
