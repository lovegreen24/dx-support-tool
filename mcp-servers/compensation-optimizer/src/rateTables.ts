/**
 * 役員報酬シミュレーションで使用する公的な税率・保険料率・等級表。
 *
 * 出典(いずれも本MCP実装時点で確認できた最新版。年度改定があるため、
 * 実務で使う際は下記URLで最新版に更新されていないか都度確認すること):
 * - 所得税速算表: 国税庁 No.2260 https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm
 * - 給与所得控除額: 国税庁 No.1410(令和7年分以降) https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
 * - 住民税均等割(森林環境税込み): 総務省 https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/150790_18.html
 * - 健康保険・厚生年金保険 標準報酬月額表(令和7年3月分〜、東京支部): 全国健康保険協会
 *   https://www.kyoukaikenpo.or.jp/g7/cat330/sb3150/r07/ (r7ippan3.xlsx)
 * - 都道府県別健康保険料率(令和7年度): 同上
 * - 厚生年金保険料率(18.3%・平成29年9月分以降固定): 日本年金機構
 * - 雇用保険料率(令和7年度・一般の事業): 厚生労働省
 */

/** 所得税の速算表(全7段階・課税所得は1,000円未満切り捨てて適用) */
export const INCOME_TAX_BRACKETS: ReadonlyArray<{ max: number | null; rate: number; deduction: number }> = [
  { max: 1949000, rate: 0.05, deduction: 0 },
  { max: 3299000, rate: 0.1, deduction: 97500 },
  { max: 6949000, rate: 0.2, deduction: 427500 },
  { max: 8999000, rate: 0.23, deduction: 636000 },
  { max: 17999000, rate: 0.33, deduction: 1536000 },
  { max: 39999000, rate: 0.4, deduction: 2796000 },
  { max: null, rate: 0.45, deduction: 4796000 },
];

/** 復興特別所得税率(所得税額に乗じる。2026年(令和8年)分まで適用) */
export const RECONSTRUCTION_TAX_RATE = 0.021;

/** 住民税所得割の標準税率(市町村6%+道府県4%。政令指定都市は8%+2%だが合計は同じ) */
export const RESIDENT_TAX_INCOME_RATE = 0.1;

/** 住民税均等割の現行標準額(森林環境税1,000円+市町村民税3,000円+道府県民税1,000円。自治体により多少上下する場合あり) */
export const RESIDENT_TAX_PER_CAPITA = 5000;

/** 基礎控除(合計所得金額2,400万円以下の場合。所得税48万円・住民税43万円で5万円の差がある) */
export const INCOME_TAX_BASIC_DEDUCTION = 480000;
export const RESIDENT_TAX_BASIC_DEDUCTION = 430000;

/** 厚生年金保険料率(労使合計。本人負担はこの半分=9.15%。平成29年9月分以降固定) */
export const PENSION_RATE = 0.183;

/**
 * 標準賞与額の上限(1,000円未満切り捨て後の賞与額に適用)。
 * 健康保険は年度累計(4月〜翌3月)573万円、厚生年金は1回の支給につき150万円が上限。
 * 出典: 全国健康保険協会「標準賞与額」https://www.kyoukaikenpo.or.jp/g3/cat330/sb3160/ 、日本年金機構。
 */
export const BONUS_STANDARD_AMOUNT_CAP_HEALTH = 5730000;
export const BONUS_STANDARD_AMOUNT_CAP_PENSION = 1500000;

/** 雇用保険料率(令和7年度・一般の事業) */
export const EMPLOYMENT_INSURANCE_EMPLOYEE_RATE = 0.0055;
export const EMPLOYMENT_INSURANCE_EMPLOYER_RATE = 0.009;

/**
 * 健康保険(協会けんぽ)の標準報酬月額表(第1級〜第50級)。
 * pensionGrade は同じ標準報酬額に対応する厚生年金保険の等級(第1級〜第32級)。
 * 厚生年金は第32級(650,000円)が上限のため、健康保険の第36級以降はpensionGrade=null。
 * upper=null は上限なし(その等級が最高等級であることを示す)。
 * 出典: 協会けんぽ 令和7年3月分(4月納付分)からの保険料額表(東京支部)。
 */
export interface StandardRemunerationGrade {
  healthGrade: number;
  pensionGrade: number | null;
  lower: number;
  upper: number | null;
  standardAmount: number;
}

export const HEALTH_INSURANCE_GRADES: ReadonlyArray<StandardRemunerationGrade> = [
  { healthGrade: 1, pensionGrade: null, lower: 0, upper: 63000, standardAmount: 58000 },
  { healthGrade: 2, pensionGrade: null, lower: 63000, upper: 73000, standardAmount: 68000 },
  { healthGrade: 3, pensionGrade: null, lower: 73000, upper: 83000, standardAmount: 78000 },
  { healthGrade: 4, pensionGrade: 1, lower: 83000, upper: 93000, standardAmount: 88000 },
  { healthGrade: 5, pensionGrade: 2, lower: 93000, upper: 101000, standardAmount: 98000 },
  { healthGrade: 6, pensionGrade: 3, lower: 101000, upper: 107000, standardAmount: 104000 },
  { healthGrade: 7, pensionGrade: 4, lower: 107000, upper: 114000, standardAmount: 110000 },
  { healthGrade: 8, pensionGrade: 5, lower: 114000, upper: 122000, standardAmount: 118000 },
  { healthGrade: 9, pensionGrade: 6, lower: 122000, upper: 130000, standardAmount: 126000 },
  { healthGrade: 10, pensionGrade: 7, lower: 130000, upper: 138000, standardAmount: 134000 },
  { healthGrade: 11, pensionGrade: 8, lower: 138000, upper: 146000, standardAmount: 142000 },
  { healthGrade: 12, pensionGrade: 9, lower: 146000, upper: 155000, standardAmount: 150000 },
  { healthGrade: 13, pensionGrade: 10, lower: 155000, upper: 165000, standardAmount: 160000 },
  { healthGrade: 14, pensionGrade: 11, lower: 165000, upper: 175000, standardAmount: 170000 },
  { healthGrade: 15, pensionGrade: 12, lower: 175000, upper: 185000, standardAmount: 180000 },
  { healthGrade: 16, pensionGrade: 13, lower: 185000, upper: 195000, standardAmount: 190000 },
  { healthGrade: 17, pensionGrade: 14, lower: 195000, upper: 210000, standardAmount: 200000 },
  { healthGrade: 18, pensionGrade: 15, lower: 210000, upper: 230000, standardAmount: 220000 },
  { healthGrade: 19, pensionGrade: 16, lower: 230000, upper: 250000, standardAmount: 240000 },
  { healthGrade: 20, pensionGrade: 17, lower: 250000, upper: 270000, standardAmount: 260000 },
  { healthGrade: 21, pensionGrade: 18, lower: 270000, upper: 290000, standardAmount: 280000 },
  { healthGrade: 22, pensionGrade: 19, lower: 290000, upper: 310000, standardAmount: 300000 },
  { healthGrade: 23, pensionGrade: 20, lower: 310000, upper: 330000, standardAmount: 320000 },
  { healthGrade: 24, pensionGrade: 21, lower: 330000, upper: 350000, standardAmount: 340000 },
  { healthGrade: 25, pensionGrade: 22, lower: 350000, upper: 370000, standardAmount: 360000 },
  { healthGrade: 26, pensionGrade: 23, lower: 370000, upper: 395000, standardAmount: 380000 },
  { healthGrade: 27, pensionGrade: 24, lower: 395000, upper: 425000, standardAmount: 410000 },
  { healthGrade: 28, pensionGrade: 25, lower: 425000, upper: 455000, standardAmount: 440000 },
  { healthGrade: 29, pensionGrade: 26, lower: 455000, upper: 485000, standardAmount: 470000 },
  { healthGrade: 30, pensionGrade: 27, lower: 485000, upper: 515000, standardAmount: 500000 },
  { healthGrade: 31, pensionGrade: 28, lower: 515000, upper: 545000, standardAmount: 530000 },
  { healthGrade: 32, pensionGrade: 29, lower: 545000, upper: 575000, standardAmount: 560000 },
  { healthGrade: 33, pensionGrade: 30, lower: 575000, upper: 605000, standardAmount: 590000 },
  { healthGrade: 34, pensionGrade: 31, lower: 605000, upper: 635000, standardAmount: 620000 },
  { healthGrade: 35, pensionGrade: 32, lower: 635000, upper: 665000, standardAmount: 650000 },
  { healthGrade: 36, pensionGrade: null, lower: 665000, upper: 695000, standardAmount: 680000 },
  { healthGrade: 37, pensionGrade: null, lower: 695000, upper: 730000, standardAmount: 710000 },
  { healthGrade: 38, pensionGrade: null, lower: 730000, upper: 770000, standardAmount: 750000 },
  { healthGrade: 39, pensionGrade: null, lower: 770000, upper: 810000, standardAmount: 790000 },
  { healthGrade: 40, pensionGrade: null, lower: 810000, upper: 855000, standardAmount: 830000 },
  { healthGrade: 41, pensionGrade: null, lower: 855000, upper: 905000, standardAmount: 880000 },
  { healthGrade: 42, pensionGrade: null, lower: 905000, upper: 955000, standardAmount: 930000 },
  { healthGrade: 43, pensionGrade: null, lower: 955000, upper: 1005000, standardAmount: 980000 },
  { healthGrade: 44, pensionGrade: null, lower: 1005000, upper: 1055000, standardAmount: 1030000 },
  { healthGrade: 45, pensionGrade: null, lower: 1055000, upper: 1115000, standardAmount: 1090000 },
  { healthGrade: 46, pensionGrade: null, lower: 1115000, upper: 1175000, standardAmount: 1150000 },
  { healthGrade: 47, pensionGrade: null, lower: 1175000, upper: 1235000, standardAmount: 1210000 },
  { healthGrade: 48, pensionGrade: null, lower: 1235000, upper: 1295000, standardAmount: 1270000 },
  { healthGrade: 49, pensionGrade: null, lower: 1295000, upper: 1355000, standardAmount: 1330000 },
  { healthGrade: 50, pensionGrade: null, lower: 1355000, upper: null, standardAmount: 1390000 },
];

/** 都道府県別 協会けんぽ健康保険料率(労使合計、令和7年度)。normal=介護保険第2号非該当、careApplicable=該当(40〜64歳) */
export interface PrefectureHealthInsuranceRate {
  normal: number;
  careApplicable: number;
}

export const HEALTH_INSURANCE_RATE_BY_PREFECTURE: Readonly<Record<string, PrefectureHealthInsuranceRate>> = {
  北海道: { normal: 0.1031, careApplicable: 0.119 },
  青森: { normal: 0.0985, careApplicable: 0.1144 },
  岩手: { normal: 0.0962, careApplicable: 0.1121 },
  宮城: { normal: 0.1011, careApplicable: 0.117 },
  秋田: { normal: 0.1001, careApplicable: 0.116 },
  山形: { normal: 0.0975, careApplicable: 0.1134 },
  福島: { normal: 0.0962, careApplicable: 0.1121 },
  茨城: { normal: 0.0967, careApplicable: 0.1126 },
  栃木: { normal: 0.0982, careApplicable: 0.1141 },
  群馬: { normal: 0.0977, careApplicable: 0.1136 },
  埼玉: { normal: 0.0976, careApplicable: 0.1135 },
  千葉: { normal: 0.0979, careApplicable: 0.1138 },
  東京: { normal: 0.0991, careApplicable: 0.115 },
  神奈川: { normal: 0.0992, careApplicable: 0.1151 },
  新潟: { normal: 0.0955, careApplicable: 0.1114 },
  富山: { normal: 0.0965, careApplicable: 0.1124 },
  石川: { normal: 0.0988, careApplicable: 0.1147 },
  福井: { normal: 0.0994, careApplicable: 0.1153 },
  山梨: { normal: 0.0989, careApplicable: 0.1148 },
  長野: { normal: 0.0969, careApplicable: 0.1128 },
  岐阜: { normal: 0.0993, careApplicable: 0.1152 },
  静岡: { normal: 0.098, careApplicable: 0.1139 },
  愛知: { normal: 0.1003, careApplicable: 0.1162 },
  三重: { normal: 0.0999, careApplicable: 0.1158 },
  滋賀: { normal: 0.0997, careApplicable: 0.1156 },
  京都: { normal: 0.1003, careApplicable: 0.1162 },
  大阪: { normal: 0.1024, careApplicable: 0.1183 },
  兵庫: { normal: 0.1016, careApplicable: 0.1175 },
  奈良: { normal: 0.1002, careApplicable: 0.1161 },
  和歌山: { normal: 0.1019, careApplicable: 0.1178 },
  鳥取: { normal: 0.0993, careApplicable: 0.1152 },
  島根: { normal: 0.0994, careApplicable: 0.1153 },
  岡山: { normal: 0.1017, careApplicable: 0.1176 },
  広島: { normal: 0.0997, careApplicable: 0.1156 },
  山口: { normal: 0.1036, careApplicable: 0.1195 },
  徳島: { normal: 0.1047, careApplicable: 0.1206 },
  香川: { normal: 0.1021, careApplicable: 0.118 },
  愛媛: { normal: 0.1018, careApplicable: 0.1177 },
  高知: { normal: 0.1013, careApplicable: 0.1172 },
  福岡: { normal: 0.1031, careApplicable: 0.119 },
  佐賀: { normal: 0.1078, careApplicable: 0.1237 },
  長崎: { normal: 0.1041, careApplicable: 0.12 },
  熊本: { normal: 0.1012, careApplicable: 0.1171 },
  大分: { normal: 0.1025, careApplicable: 0.1184 },
  宮崎: { normal: 0.1009, careApplicable: 0.1168 },
  鹿児島: { normal: 0.1031, careApplicable: 0.119 },
  沖縄: { normal: 0.0944, careApplicable: 0.1103 },
};
