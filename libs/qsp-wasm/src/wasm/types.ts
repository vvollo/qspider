export type CharsPtr = number;
export type BufferPtr = number;
export type Ptr = number;
export type IntPointer = number;
export type FunctionPtr = number;

export enum QspCallType {
  DEBUG /* void func(QSPString str) */,
  ISPLAYINGFILE /* QSP_BOOL func(QSPString file) */,
  PLAYFILE /* void func(QSPString file, int volume) */,
  CLOSEFILE /* void func(QSPString file) */,
  SHOWIMAGE /* void func(QSPString file) */,
  SHOWWINDOW /* void func(int type, QSP_BOOL isShow) */,
  SHOWMENU /* int func(QSPListItem *items, int count) */,
  SHOWMSGSTR /* void func(QSPString text) */,
  REFRESHINT /* void func(QSP_BOOL isRedraw) */,
  SETTIMER /* void func(int msecs) */,
  SETINPUTSTRTEXT /* void func(QSPString text) */,
  SYSTEM /* void func(QSPString cmd) */,
  OPENGAME /* void func(QSP_BOOL isNewGame) */,
  OPENGAMESTATUS /* void func(QSPString file) */,
  SAVEGAMESTATUS /* void func(QSPString file) */,
  SLEEP /* void func(int msecs) */,
  GETMSCOUNT /* int func() */,
  INPUTBOX /* void func(QSPString text, QSP_CHAR *buffer, int maxLen) */,
  DUMMY,
}
