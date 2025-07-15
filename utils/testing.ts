import { Builder, Cell, beginCell } from '@ton/core';
import '@ton/test-utils';

export const assertMsgBodyEqual =
    (writer: (builder: Builder) => void) =>
    (x: Cell | undefined): boolean => {
        if (!x) return false;
        expect(x).toEqualCell(beginCell().store(writer).endCell());
        return true;
    };
