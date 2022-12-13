import { Element } from './content/element';
import { Node } from 'interweave';
import { QspMainContent } from './theme-core/main-content';
import { QspStats } from './theme-core/stats';
import { QspStatsContent } from './theme-core/stats-content';
import { QspActionImage, QspActionIndex, QspActionName, QspActions, QspActionsList } from './theme-core/actions';
import { extractAttributes, GameAction } from '@qspider/game-state';
import { QspObjectImage, QspObjectIndex, QspObjectName, QspObjects, QspObjectsList } from './theme-core/objects';
import { QspCmd, QspCmdInput } from './theme-core/cmd';
import { QspView, QspViewImage } from './theme-core/view';
import { QspMenu, QspMenuItemImage, QspMenuItemIndex, QspMenuItemName, QspMenuList } from './theme-core/menu';
import { QspMsg, QspMsgContent } from './theme-core/msg';
import { QspInput, QspInputContent, QspInputTag } from './theme-core/input';
import { QspCancelButton, QspCloseButton, QspOkButton } from './theme-core/buttons';
import {
  QspPauseScreenContent,
  QspPauseScreenCredits,
  QspPauseScreenLoad,
  QspPauseScreenPreferences,
  QspPauseScreenSave,
  QspSlotDate,
  QspSlotIndex,
  QspSlotsList,
} from './theme-core/pause-screen';
import { QspButton } from './theme-core/qsp-button';
import { QspScrollable } from './theme-core/scrollable';
import { QspVariable } from './theme-core/qsp-variable';
import { QspRegion } from './theme-core/qsp-region';
import { QspShow } from './theme-core/qsp-show';

const transformers: Record<string, (node: HTMLElement, children: Node[]) => React.ReactNode | null> = {
  'qsp-scrollable'(node, children) {
    const { scroll, ...attributes } = extractAttributes(node);
    return <QspScrollable attributes={attributes}>{children}</QspScrollable>;
  },
  'qsp-main-content'() {
    return <QspMainContent />;
  },
  'qsp-stats'(node, children) {
    const attributes = extractAttributes(node);
    return <QspStats attributes={attributes}>{children}</QspStats>;
  },
  'qsp-stats-content'() {
    return <QspStatsContent />;
  },
  'qsp-actions'(node, children) {
    const attributes = extractAttributes(node);
    return <QspActions attributes={attributes}>{children}</QspActions>;
  },
  'qsp-actions-list'() {
    return <QspActionsList />;
  },
  'qsp-action-name'() {
    return <QspActionName />;
  },
  'qsp-action-image'() {
    return <QspActionImage />;
  },
  'qsp-action-index'() {
    return <QspActionIndex />;
  },
  'qsp-objects'(node, children) {
    const attributes = extractAttributes(node);
    return <QspObjects attributes={attributes}>{children}</QspObjects>;
  },
  'qsp-objects-list'() {
    return <QspObjectsList />;
  },
  'qsp-object-name'() {
    return <QspObjectName />;
  },
  'qsp-object-image'() {
    return <QspObjectImage />;
  },
  'qsp-object-index'() {
    return <QspObjectIndex />;
  },
  'qsp-cmd'(node, children) {
    const attributes = extractAttributes(node);
    return <QspCmd attributes={attributes}>{children}</QspCmd>;
  },
  'qsp-cmd-input'(node) {
    const attributes = extractAttributes(node);
    return <QspCmdInput attributes={attributes} />;
  },
  'qsp-view'(node, children) {
    const attributes = extractAttributes(node);
    return <QspView attributes={attributes}>{children}</QspView>;
  },
  'qsp-view-image'(node) {
    const attributes = extractAttributes(node);
    return <QspViewImage attributes={attributes} />;
  },
  'qsp-menu'(node, children) {
    const attributes = extractAttributes(node);
    return <QspMenu attributes={attributes}>{children}</QspMenu>;
  },
  'qsp-menu-list'() {
    return <QspMenuList />;
  },
  'qsp-menu-name'() {
    return <QspMenuItemName />;
  },
  'qsp-menu-image'() {
    return <QspMenuItemImage />;
  },
  'qsp-menu-index'() {
    return <QspMenuItemIndex />;
  },
  'qsp-msg'(node, children) {
    const attributes = extractAttributes(node);
    return <QspMsg attributes={attributes}>{children}</QspMsg>;
  },
  'qsp-msg-content'() {
    return <QspMsgContent />;
  },
  'qsp-input'(node, children) {
    const attributes = extractAttributes(node);
    return <QspInput attributes={attributes}>{children}</QspInput>;
  },
  'qsp-input-content'() {
    return <QspInputContent />;
  },
  'qsp-input-tag'(node) {
    const attributes = extractAttributes(node);
    return <QspInputTag attributes={attributes} />;
  },
  'qsp-close-button'(node, children) {
    const attributes = extractAttributes(node);
    return <QspCloseButton attributes={attributes}>{children}</QspCloseButton>;
  },
  'qsp-ok-button'(node, children) {
    const attributes = extractAttributes(node);
    return <QspOkButton attributes={attributes}>{children}</QspOkButton>;
  },
  'qsp-cancel-button'(node, children) {
    const attributes = extractAttributes(node);
    return <QspCancelButton attributes={attributes}>{children}</QspCancelButton>;
  },
  'qsp-button'(node, children) {
    const action = (node.getAttribute('type') || 'credits') as GameAction;
    const attributes = extractAttributes(node);
    return (
      <QspButton action={action} attributes={attributes}>
        {children}
      </QspButton>
    );
  },
  'qsp-pause-screen-content'(node, children) {
    const attributes = extractAttributes(node);
    return <QspPauseScreenContent attributes={attributes}>{children}</QspPauseScreenContent>;
  },
  'qsp-pause-screen-credits'(node, children) {
    const attributes = extractAttributes(node);
    return <QspPauseScreenCredits attributes={attributes}>{children}</QspPauseScreenCredits>;
  },
  'qsp-pause-screen-preferences'(node, children) {
    const attributes = extractAttributes(node);
    return <QspPauseScreenPreferences attributes={attributes}>{children}</QspPauseScreenPreferences>;
  },
  'qsp-pause-screen-save'(node, children) {
    const attributes = extractAttributes(node);
    return <QspPauseScreenSave attributes={attributes}>{children}</QspPauseScreenSave>;
  },
  'qsp-pause-screen-load'(node, children) {
    const attributes = extractAttributes(node);
    return <QspPauseScreenLoad attributes={attributes}>{children}</QspPauseScreenLoad>;
  },
  'qsp-slots-list'() {
    return <QspSlotsList />;
  },
  'qsp-save-slot-index'() {
    return <QspSlotIndex />;
  },
  'qsp-save-slot-date'() {
    return <QspSlotDate />;
  },
  'qsp-variable'(node) {
    const { name, key, index } = extractAttributes(node);
    return (
      <QspVariable
        name={name as string}
        key={key as string}
        index={index ? parseInt(index as string, 10) : undefined}
      />
    );
  },
  'qsp-region'(node) {
    const { name, ...attributes } = extractAttributes(node);
    return <QspRegion name={name as string} attributes={attributes} />;
  },
  'qsp-show'(node, children) {
    const condition = node.getAttribute('when') || '';
    return <QspShow condition={condition}>{children}</QspShow>;
  },
};

function defaultTransform(node: HTMLElement, children: Node[]): React.ReactNode {
  const tagName = node.tagName.toLowerCase();
  const attributes = extractAttributes(node);
  return (
    <Element tagName={tagName} attributes={attributes}>
      {children}
    </Element>
  );
}

export const transform = (node: HTMLElement, children: Node[]): React.ReactNode | null => {
  const transformer = transformers[node.tagName.toLowerCase()];
  if (transformer) {
    return transformer(node, children);
  }
  return defaultTransform(node, children);
};
