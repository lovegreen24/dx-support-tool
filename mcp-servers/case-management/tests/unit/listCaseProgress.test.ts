import { jest } from '@jest/globals';

const listDataRowsMock = jest.fn<() => Promise<string[][]>>();

jest.unstable_mockModule('../../src/api/sheets.js', () => ({
  CaseSheetClient: jest.fn().mockImplementation(() => ({
    listDataRows: listDataRowsMock,
  })),
}));

jest.unstable_mockModule('../../src/config.js', () => ({
  loadConfig: jest.fn(() => ({
    spreadsheetId: 'sheet-id',
    serviceAccount: { client_email: 'sa@example.com', private_key: 'pk' },
  })),
}));

const { handleListCaseProgress } = await import('../../src/tools/listCaseProgress.js');

function buildRow(caseId: string, clientId: string, clientName: string): string[] {
  return [
    caseId,
    clientId,
    clientName,
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
}

function buildEmptyRow(): string[] {
  return new Array(16).fill('');
}

describe('handleListCaseProgress', () => {
  beforeEach(() => {
    listDataRowsMock.mockReset();
  });

  it('絞り込み無しなら全件返す', async () => {
    listDataRowsMock.mockResolvedValue([buildRow('CASE-1', 'C-001', 'A社'), buildRow('CASE-2', 'C-002', 'B社')]);

    const result = await handleListCaseProgress({});

    expect(result.total).toBe(2);
    expect(result.cases.map((c) => c.case_id)).toEqual(['CASE-1', 'CASE-2']);
  });

  it('case_idで絞り込める', async () => {
    listDataRowsMock.mockResolvedValue([buildRow('CASE-1', 'C-001', 'A社'), buildRow('CASE-2', 'C-002', 'B社')]);

    const result = await handleListCaseProgress({ case_id: 'CASE-2' });

    expect(result.total).toBe(1);
    expect(result.cases[0].client_name).toBe('B社');
  });

  it('client_idで絞り込める', async () => {
    listDataRowsMock.mockResolvedValue([buildRow('CASE-1', 'C-001', 'A社'), buildRow('CASE-2', 'C-001', 'A社別案件')]);

    const result = await handleListCaseProgress({ client_id: 'C-001' });

    expect(result.total).toBe(2);
  });

  it('case_id列が空の行(空行)は除外する', async () => {
    listDataRowsMock.mockResolvedValue([buildRow('CASE-1', 'C-001', 'A社'), buildEmptyRow()]);

    const result = await handleListCaseProgress({});

    expect(result.total).toBe(1);
  });

  it('該当なしの場合は空配列を返す', async () => {
    listDataRowsMock.mockResolvedValue([buildRow('CASE-1', 'C-001', 'A社')]);

    const result = await handleListCaseProgress({ case_id: 'NOT-FOUND' });

    expect(result.total).toBe(0);
    expect(result.cases).toEqual([]);
  });
});
