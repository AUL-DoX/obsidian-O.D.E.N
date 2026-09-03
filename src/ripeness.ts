/**
 * 「放置日数 ÷ しきい値」の比率から、煮込み具合（熟成ステータス）を算出する。
 * しきい値ちょうどで候補に上り始めるため、ratio=1.0が「煮込み始め」の基準になる。
 */
export interface RipenessInfo {
	/** 0〜1+ の進捗率（表示上は1.0で頭打ち） */
	progress: number;
	/** ステータスラベル */
	label: string;
	/** 表現用アイコン（絵文字） */
	icon: string;
	/** CSSで色分けするためのティア識別子 */
	tier: "simmering" | "soaking" | "ready";
}

export function getRipenessInfo(staleDays: number, thresholdDays: number): RipenessInfo {
	const ratio = thresholdDays > 0 ? staleDays / thresholdDays : 1;

	// しきい値到達(ratio=1.0)〜2倍(ratio=2.0)の範囲で3段階に分割。
	// 例: しきい値30日なら 30〜40日=煮込み中, 40〜60日=味しみ中, 60日以上=食べごろ
	if (ratio < 4 / 3) {
		return {
			progress: Math.min((ratio - 1) / (1 / 3), 1),
			label: "コトコト煮込み中",
			icon: "🍢",
			tier: "simmering",
		};
	}
	if (ratio < 2) {
		return {
			progress: Math.min((ratio - 4 / 3) / (2 / 3), 1),
			label: "味がしみ込み中",
			icon: "🍲",
			tier: "soaking",
		};
	}
	return {
		progress: 1,
		label: "食べごろ！",
		icon: "🔥",
		tier: "ready",
	};
}
