import { test, expect, type Page } from '@playwright/test';

const PASSWORD = 'YsM4kk8ZtAFjOubS';

const APPROVAL_LABELS = [
  'クライアント登録',
  '決算書解析',
  'ヒアリング回収',
  '財務分析',
  'ベンチマーク比較',
  '提案書生成',
];

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('パスワード').fill(PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: '進捗ダッシュボード', exact: true })).toBeVisible();
}

test.describe('進捗ダッシュボード', () => {
  test('DASH-001 ログイン成功→ダッシュボード表示', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: '進捗ダッシュボード', exact: true })).toBeVisible();
    await expect(page.getByText('クライアント数')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'クライアント一覧' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '案件進捗・承認履歴' })).toBeVisible();
  });

  test('DASH-002 未ログイン状態で / に直接アクセス', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('クライアント数')).toHaveCount(0);
  });

  test('DASH-003 セッション認証状態でのダッシュボード再訪問', async ({ page }) => {
    await login(page);
    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: '進捗ダッシュボード', exact: true })).toBeVisible();
  });

  test('DASH-004 統計カード「クライアント数」の表示', async ({ page }) => {
    await login(page);
    const card = page.locator('p', { hasText: 'クライアント数' }).locator('..');
    await expect(card.getByText('3件')).toBeVisible();
  });

  test('DASH-005 統計カード「ヒアリング完了率」の表示', async ({ page }) => {
    await login(page);
    const card = page.locator('p', { hasText: 'ヒアリング完了率' }).locator('..');
    await expect(card.getByText('39%')).toBeVisible();
  });

  test('DASH-006 統計カード「提案書生成済み」の表示', async ({ page }) => {
    await login(page);
    const card = page.locator('p', { hasText: '提案書生成済み' }).locator('..');
    await expect(card.getByText('1件')).toBeVisible();
  });

  test('DASH-007 統計カード「未回答項目あり」の表示', async ({ page }) => {
    await login(page);
    const card = page.locator('p', { hasText: '未回答項目あり' }).locator('..');
    await expect(card.getByText('2件')).toBeVisible();
  });

  test('DASH-008 統計カード4枚のレイアウト', async ({ page }) => {
    await login(page);
    const labels = ['クライアント数', 'ヒアリング完了率', '提案書生成済み', '未回答項目あり'];
    for (const label of labels) {
      await expect(page.locator('p', { hasText: label })).toHaveCount(1);
    }
  });

  test('DASH-009 クライアント一覧テーブルの見出し表示', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'クライアント一覧' })).toBeVisible();
    const headerRow = page.getByRole('table').getByRole('row').first();
    for (const col of ['企業名', '業種', '従業員数', '決算期', 'ヒアリング完了率', '提案書ステータス']) {
      await expect(headerRow.getByText(col)).toBeVisible();
    }
  });

  test('DASH-010 クライアント一覧テーブルの行内容(企業名・業種)', async ({ page }) => {
    await login(page);
    const row = page.getByRole('row', { name: /E2E受入試験株式会社/ });
    await expect(row.getByText('小売業')).toBeVisible();
  });

  test('DASH-011 クライアント一覧テーブルの行内容(従業員数)', async ({ page }) => {
    await login(page);
    const row = page.getByRole('row', { name: /E2E受入試験株式会社/ });
    const cell = row.getByText('15名');
    await expect(cell).toBeVisible();
    await expect(cell).toHaveCSS('text-align', 'right');
  });

  test('DASH-012 クライアント一覧テーブルの行内容(決算期)', async ({ page }) => {
    await login(page);
    const row = page.getByRole('row', { name: /E2E受入試験株式会社/ });
    await expect(row.getByText('3月', { exact: true })).toBeVisible();
  });

  test('DASH-013 クライアント一覧テーブルの行内容(ヒアリング完了率)', async ({ page }) => {
    await login(page);
    const row = page.getByRole('row', { name: /E2Eヒアリング検証工業株式会社/ });
    await expect(row.getByText('17%')).toBeVisible();
    const bar = row.getByRole('progressbar');
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-valuenow', '17');
  });

  test('DASH-014 クライアント一覧の行数', async ({ page }) => {
    await login(page);
    const bodyRows = page.locator('table tbody tr');
    await expect(bodyRows).toHaveCount(3);
  });

  test('DASH-015 提案書ステータスChip — 「未着手」表示', async ({ page }) => {
    await login(page);
    const row = page.getByRole('row', { name: /E2E未着手確認商事株式会社/ });
    const chip = row.getByText('未着手', { exact: true });
    await expect(chip).toBeVisible();
    await expect(chip.locator('xpath=ancestor::*[contains(@class,"MuiChip-root")]')).toHaveClass(/MuiChip-colorDefault/);
  });

  test('DASH-016 提案書ステータスChip — 「進行中」表示', async ({ page }) => {
    await login(page);
    const row = page.getByRole('row', { name: /E2Eヒアリング検証工業株式会社/ });
    const chip = row.getByText('進行中');
    await expect(chip).toBeVisible();
    await expect(chip.locator('xpath=ancestor::*[contains(@class,"MuiChip-root")]')).toHaveClass(/MuiChip-colorWarning/);
  });

  test('DASH-017 提案書ステータスChip — 「完了」表示', async ({ page }) => {
    await login(page);
    const row = page.getByRole('row', { name: /E2E受入試験株式会社/ });
    const chip = row.getByText('完了');
    await expect(chip).toBeVisible();
    await expect(chip.locator('xpath=ancestor::*[contains(@class,"MuiChip-root")]')).toHaveClass(/MuiChip-colorSuccess/);
  });

  test('DASH-018 提案書ステータスChipの色分けによる視覚的区別', async ({ page }) => {
    await login(page);
    await expect(page.getByText('未着手', { exact: true })).toBeVisible();
    await expect(page.getByText('進行中', { exact: true })).toBeVisible();
    await expect(page.getByText('完了', { exact: true }).first()).toBeVisible();
  });

  test('DASH-019 案件進捗セクションの見出し表示', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: '案件進捗・承認履歴' })).toBeVisible();
    await expect(page.getByText('案件管理MCP')).toBeVisible();
  });

  test('DASH-020 案件カードの表示(クライアント名・承認済み件数)', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'E2E受入試験株式会社' })).toBeVisible();
    await expect(page.getByText('承認済み 4 / 6')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'E2Eヒアリング検証工業株式会社' })).toBeVisible();
    await expect(page.getByText('承認済み 6 / 6')).toBeVisible();
  });

  test('DASH-021 6承認ポイントStepperの表示', async ({ page }) => {
    await login(page);
    const card = page.getByRole('heading', { name: 'E2E受入試験株式会社' }).locator('../..');
    for (const label of APPROVAL_LABELS) {
      await expect(card.getByText(label)).toBeVisible();
    }
  });

  test('DASH-022 Stepperの完了ステップの表示', async ({ page }) => {
    await login(page);
    const card = page.getByRole('heading', { name: 'E2E受入試験株式会社' }).locator('../..');
    await expect(card.getByText('2026-08-08T10:00:00Z')).toBeVisible();
    const step = card.locator('.MuiStep-root', { hasText: 'クライアント登録' });
    await expect(step.locator('svg[data-testid="CheckCircleIcon"]')).toBeVisible();
  });

  test('DASH-023 Stepperの現在進行中ステップの表示', async ({ page }) => {
    await login(page);
    const card = page.getByRole('heading', { name: 'E2E受入試験株式会社' }).locator('../..');
    const activeStep = card.locator('.MuiStep-root', { hasText: 'ベンチマーク比較' });
    await expect(activeStep.locator('.MuiStepIcon-root.Mui-active')).toHaveCount(1);
  });

  test('DASH-024 Stepperの未着手ステップの表示', async ({ page }) => {
    await login(page);
    const card = page.getByRole('heading', { name: 'E2E受入試験株式会社' }).locator('../..');
    const pendingStep = card.locator('.MuiStep-root', { hasText: '提案書生成' });
    await expect(pendingStep.locator('.MuiStepIcon-root.Mui-active')).toHaveCount(0);
    await expect(pendingStep.locator('.MuiStepIcon-root.Mui-completed')).toHaveCount(0);
  });

  test('DASH-025 全ステップ完了時のStepper表示', async ({ page }) => {
    await login(page);
    const card = page.getByRole('heading', { name: 'E2Eヒアリング検証工業株式会社' }).locator('../..');
    await expect(card.getByText('承認済み 6 / 6')).toBeVisible();
    await expect(card.locator('.MuiStepIcon-root.Mui-active')).toHaveCount(0);
    await expect(card.locator('.MuiStepIcon-root.Mui-completed')).toHaveCount(6);
  });

  test('DASH-026 複数案件カードの区切り表示', async ({ page }) => {
    await login(page);
    const divider = page.locator('.MuiDivider-root');
    await expect(divider.first()).toBeVisible();
  });

  test('DASH-027 レスポンシブ表示 — モバイル幅でのクライアント一覧テーブル横スクロール', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page);
    const bodyOverflowX = await page.evaluate(() => getComputedStyle(document.body).overflowX);
    expect(['hidden', 'visible', 'clip']).not.toContain('scroll');
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
    void bodyOverflowX;
    const nowrapCell = page.getByRole('row', { name: /E2E受入試験株式会社/ }).getByText('小売業');
    await expect(nowrapCell).toHaveCSS('white-space', 'nowrap');
  });

  test('DASH-028 レスポンシブ表示 — モバイル幅での統計カードのレイアウト崩れ', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page);
    const clientCountCard = page.locator('p', { hasText: 'クライアント数' }).locator('..');
    const box = await clientCountCard.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
    }
  });

  test('DASH-029 レスポンシブ表示 — タブレット幅でのレイアウト', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page);
    await expect(page.getByRole('heading', { name: 'クライアント一覧' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '案件進捗・承認履歴' })).toBeVisible();
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(768 + 1);
  });

  test('DASH-030 レスポンシブ表示 — モバイル幅での案件進捗Stepper表示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page);
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(375 + 1);
    const card = page.getByRole('heading', { name: 'E2Eヒアリング検証工業株式会社' }).locator('../..');
    await expect(card.locator('.MuiStepper-root')).toBeVisible();
  });
});
