import { jest } from '@jest/globals';

const listDataRowsMock = jest.fn<() => Promise<string[][]>>();
const appendRowMock = jest.fn<(row: string[]) => Promise<void>>();
const updateRowMock = jest.fn<(rowNumber: number, row: string[]) => Promise<void>>();

jest.unstable_mockModule('../../src/api/sheets.js', () => ({
  CaseSheetClient: jest.fn().mockImplementation(() => ({
    listDataRows: listDataRowsMock,
    appendRow: appendRowMock,
    updateRow: updateRowMock,
  })),
}));

jest.unstable_mockModule('../../src/config.js', () => ({
  loadConfig: jest.fn(() => ({
    spreadsheetId: 'sheet-id',
    serviceAccount: { client_email: 'sa@example.com', private_key: 'pk' },
  })),
}));

const { handleRecordCaseApproval } = await import('../../src/tools/recordCaseApproval.js');

describe('handleRecordCaseApproval', () => {
  beforeEach(() => {
    listDataRowsMock.mockReset();
    appendRowMock.mockReset();
    updateRowMock.mockReset();
  });

  it('case_id未指定はエラー(Sheets APIは呼ばない)', async () => {
    await expect(
      handleRecordCaseApproval({ case_id: '', client_id: 'C-001', step: 1 }),
    ).rejects.toThrow(/case_id/);
    expect(listDataRowsMock).not.toHaveBeenCalled();
  });

  it('stepが範囲外(0や7)はエラー', async () => {
    await expect(
      handleRecordCaseApproval({ case_id: 'CASE-1', client_id: 'C-001', step: 0 }),
    ).rejects.toThrow(/step/);
    await expect(
      handleRecordCaseApproval({ case_id: 'CASE-1', client_id: 'C-001', step: 7 }),
    ).rejects.toThrow(/step/);
  });

  it('未登録のcase_idかつclient_name未指定はエラー', async () => {
    listDataRowsMock.mockResolvedValue([]);
    await expect(
      handleRecordCaseApproval({ case_id: 'CASE-NEW', client_id: 'C-001', step: 1 }),
    ).rejects.toThrow(/client_name/);
  });

  it('未登録のcase_idはstep1〜6をpendingで初期化した新規行を追加し、対象ステップをcompletedにする', async () => {
    listDataRowsMock.mockResolvedValue([]);

    const result = await handleRecordCaseApproval({
      case_id: 'CASE-NEW',
      client_id: 'C-001',
      client_name: '新規株式会社',
      step: 1,
      approved_at: '2026-01-01T00:00:00.000Z',
    });

    expect(result.created).toBe(true);
    expect(result.case.case_id).toBe('CASE-NEW');
    expect(result.case.client_name).toBe('新規株式会社');
    expect(result.case.steps[0]).toEqual({
      label: 'クライアント登録',
      status: 'completed',
      approved_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.case.steps[1].status).toBe('active');
    expect(appendRowMock).toHaveBeenCalledTimes(1);
    expect(updateRowMock).not.toHaveBeenCalled();
  });

  it('登録済みのcase_idは既存行を更新する(ヘッダー行分オフセットした行番号でupdateRowを呼ぶ)', async () => {
    const existingRow = [
      'CASE-EXIST',
      'C-002',
      '既存株式会社',
      'completed',
      'active',
      'pending',
      'pending',
      'pending',
      'pending',
      '2026-01-01T00:00:00.000Z',
      '',
      '',
      '',
      '',
      '',
      '2026-01-01T00:00:00.000Z',
    ];
    listDataRowsMock.mockResolvedValue([existingRow]);

    const result = await handleRecordCaseApproval({
      case_id: 'CASE-EXIST',
      client_id: 'C-002',
      step: 2,
      approved_at: '2026-01-05T00:00:00.000Z',
    });

    expect(result.created).toBe(false);
    expect(result.case.steps[1]).toEqual({
      label: '決算書解析',
      status: 'completed',
      approved_at: '2026-01-05T00:00:00.000Z',
    });
    expect(result.case.steps[2].status).toBe('active');
    expect(updateRowMock).toHaveBeenCalledTimes(1);
    const [rowNumber] = updateRowMock.mock.calls[0];
    expect(rowNumber).toBe(2); // ヘッダー行(1) + データ行index(0) + 1
    expect(appendRowMock).not.toHaveBeenCalled();
  });

  it('statusを明示的にpendingに指定すると次ステップは繰り上がらずapproved_atも設定されない', async () => {
    listDataRowsMock.mockResolvedValue([]);

    const result = await handleRecordCaseApproval({
      case_id: 'CASE-PENDING',
      client_id: 'C-003',
      client_name: 'ペンディング商事',
      step: 3,
      status: 'pending',
    });

    expect(result.case.steps[2]).toEqual({ label: 'ヒアリング回収', status: 'pending', approved_at: null });
    expect(result.case.steps[3].status).toBe('pending');
  });
});
