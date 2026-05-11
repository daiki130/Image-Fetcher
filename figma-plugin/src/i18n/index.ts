/**
 * UI 側の i18n ランタイム。
 *
 * - 起動時はまず `navigator.language` から推定した言語を仮の初期値として表示する。
 * - 同時に main.ts に対して `LOAD_LANGUAGE` を送信し、`figma.clientStorage` に
 *   保存済みの言語があれば `LANGUAGE_LOADED` で受け取って上書きする。
 * - 言語が変わるたびに main.ts へ次の 2 種類のメッセージを送る:
 *     - `SET_LANGUAGE`  : main 側の `figma.notify` 等の現在言語を同期するためのもの
 *     - `SAVE_LANGUAGE` : `figma.clientStorage` に保存させるためのリクエスト
 * - 現在言語はモジュールスコープのグローバルストアに保持し、すべての `useI18n()`
 *   呼び出し側はそのストアを購読する。これにより 1 箇所で言語を切り替えれば
 *   Footer / Dummy / SettingsMenu / ApplyImageLoadingModal 等すべてのコンポーネントが
 *   同時に再レンダリングされる。
 */

import { useEffect, useState, useCallback } from "preact/hooks";
import { emit, on } from "@create-figma-plugin/utilities";
import {
  DEFAULT_LANG,
  Lang,
  LANG_LABELS,
  SUPPORTED_LANGS,
  TranslationKey,
  dateLocale,
  translate,
} from "./messages";

export {
  DEFAULT_LANG,
  DUMMY_TAB_UI_HEIGHT_BY_LANG,
  LANG_LABELS,
  SUPPORTED_LANGS,
  dateLocale,
  translate,
} from "./messages";
export type { Lang, TranslationKey } from "./messages";

/** ブラウザ設定（`navigator.language`）から対応言語を推定する。未対応ならデフォルト。 */
function detectFromNavigator(): Lang {
  try {
    const candidates: string[] = [];
    if (typeof navigator !== "undefined") {
      if (Array.isArray(navigator.languages)) {
        for (const l of navigator.languages) {
          if (typeof l === "string") candidates.push(l);
        }
      }
      if (typeof navigator.language === "string") {
        candidates.push(navigator.language);
      }
    }
    for (const raw of candidates) {
      const lower = raw.toLowerCase();
      const head = lower.split("-")[0];
      const found = SUPPORTED_LANGS.find((l) => l === head);
      if (found) return found;
    }
  } catch {
    /* ignore: SSR / 制限環境 */
  }
  return DEFAULT_LANG;
}

function isSupportedLang(value: unknown): value is Lang {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGS as ReadonlyArray<string>).indexOf(value) !== -1
  );
}

// ─── グローバルストア ──────────────────────────────────────────────
// すべてのコンポーネントから参照される単一の言語状態。
// `setLang()` で更新すると、購読中のすべてのコンポーネントへ通知される。

let currentLang: Lang = detectFromNavigator();
const subscribers = new Set<(lang: Lang) => void>();

/**
 * `figma.clientStorage` からの保存値ロードが完了したかどうか。
 * 完了前にユーザー操作で言語が変更された場合は、その値を優先したいので
 * 後から来た `LANGUAGE_LOADED` での上書きをスキップする。
 */
let hasLoadedFromStorage = false;
let userChangedBeforeLoad = false;

/** 同期的に現在言語を取得（フック外から参照したい場面用） */
export function getLang(): Lang {
  return currentLang;
}

function notifySubscribers(next: Lang) {
  // 通知中に Set を変更するケースを避けるためコピーしてから呼ぶ
  for (const fn of Array.from(subscribers)) {
    fn(next);
  }
}

/**
 * 言語を変更し、購読中のすべてのコンポーネントへ通知する。
 * main 側への現在言語の同期 (`SET_LANGUAGE`) と、
 * `figma.clientStorage` への保存リクエスト (`SAVE_LANGUAGE`) も行う。
 */
export function setLang(next: Lang) {
  if (next === currentLang) return;
  currentLang = next;
  if (!hasLoadedFromStorage) {
    // 起動直後にユーザーが切り替えた場合は、後続の LANGUAGE_LOADED で
    // 上書きされないようにフラグを立てる
    userChangedBeforeLoad = true;
  }
  try {
    emit("SET_LANGUAGE", { lang: next });
  } catch {
    /* main 未初期化等は無視 */
  }
  try {
    emit("SAVE_LANGUAGE", { lang: next });
  } catch {
    /* main 未初期化等は無視 */
  }
  notifySubscribers(next);
}

function subscribe(fn: (lang: Lang) => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

// 起動直後に main 側へ現在言語（navigator 推定値）を同期しておく。
// main 側の clientStorage にすでに保存値があれば、後続の LANGUAGE_LOADED で
// 上書きされる。
try {
  emit("SET_LANGUAGE", { lang: currentLang });
} catch {
  /* ignore */
}

// `figma.clientStorage` の保存値を main 側にロードしてもらう。
// レスポンスは `LANGUAGE_LOADED` イベントで返ってくる。
try {
  on("LANGUAGE_LOADED", (data: { lang: Lang | null }) => {
    hasLoadedFromStorage = true;
    if (userChangedBeforeLoad) return;
    if (!data || !isSupportedLang(data.lang)) return;
    if (data.lang === currentLang) return;
    currentLang = data.lang;
    try {
      emit("SET_LANGUAGE", { lang: currentLang });
    } catch {
      /* ignore */
    }
    notifySubscribers(currentLang);
  });
  emit("LOAD_LANGUAGE");
} catch {
  /* on/emit が使えない環境（テスト等）は無視 */
}

/**
 * 現在の言語、切替関数、翻訳関数 `t` を返す Preact フック。
 * モジュール内のグローバルストアを購読するため、
 * どのコンポーネントから呼んでも同じ `lang` が返る。
 */
export function useI18n() {
  const [lang, setLocal] = useState<Lang>(currentLang);

  // ストアを購読し、変更があればローカルステートを更新して再レンダーをトリガー
  useEffect(() => {
    // マウント時点でストアが進んでいたら追従
    if (currentLang !== lang) {
      setLocal(currentLang);
    }
    return subscribe((next) => setLocal(next));
    // lang 依存にする必要はない: subscribe は毎回フレッシュなコールバックを使う
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 起動時にも main へ同期しておく（main の on() 登録タイミング次第で
  // モジュール初期化時の emit が漏れるケースを保険的にカバー）
  useEffect(() => {
    try {
      emit("SET_LANGUAGE", { lang });
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(lang, key, params),
    [lang],
  );

  return {
    lang,
    setLang,
    t,
    label: LANG_LABELS[lang],
    locale: dateLocale(lang),
  };
}
