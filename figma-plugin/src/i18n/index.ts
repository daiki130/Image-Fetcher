/**
 * UI 側の i18n ランタイム。
 *
 * - 起動時に localStorage の保存値、なければ navigator.language から言語を判定する。
 * - 現在言語はモジュールスコープのグローバルストアに保持し、すべての `useI18n()`
 *   呼び出し側はそのストアを購読する。これにより 1 箇所で言語を切り替えれば
 *   Footer / Dummy / SettingsMenu / ApplyImageLoadingModal 等すべてのコンポーネントが
 *   同時に再レンダリングされる。
 * - 言語が変わるたびに main.ts 側へ `SET_LANGUAGE` を emit するので、
 *   figma.notify 等でも翻訳済みの文言を表示できる。
 */

import { useEffect, useState, useCallback } from "preact/hooks";
import { emit } from "@create-figma-plugin/utilities";
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

const STORAGE_KEY = "image-fetcher-lang";

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

/** 起動直後に確定した言語を返す（localStorage > navigator.language > default） */
function getInitialLang(): Lang {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (SUPPORTED_LANGS as ReadonlyArray<string>).includes(saved)) {
        return saved as Lang;
      }
    }
  } catch {
    /* ignore */
  }
  return detectFromNavigator();
}

/** localStorage への永続化（失敗しても黙って無視） */
function persist(lang: Lang) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  } catch {
    /* ignore */
  }
}

// ─── グローバルストア ──────────────────────────────────────────────
// すべてのコンポーネントから参照される単一の言語状態。
// `setLang()` で更新すると、購読中のすべてのコンポーネントへ通知される。

let currentLang: Lang = getInitialLang();
const subscribers = new Set<(lang: Lang) => void>();

/** 同期的に現在言語を取得（フック外から参照したい場面用） */
export function getLang(): Lang {
  return currentLang;
}

/**
 * 言語を変更し、購読中のすべてのコンポーネントへ通知する。
 * localStorage への永続化と main 側への emit も行う。
 */
export function setLang(next: Lang) {
  if (next === currentLang) return;
  currentLang = next;
  persist(next);
  try {
    emit("SET_LANGUAGE", { lang: next });
  } catch {
    /* main 未初期化等は無視 */
  }
  // 通知中に Set を変更するケースを避けるためコピーしてから呼ぶ
  for (const fn of Array.from(subscribers)) {
    fn(next);
  }
}

function subscribe(fn: (lang: Lang) => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

// 起動直後に main 側へ初期言語を同期しておく（モジュール読み込み時に1回だけ）。
// main がまだ on() を登録する前のタイミングでも、UI 側のフックが初回 emit を
// 行うため重複を許容しても問題ない。
try {
  emit("SET_LANGUAGE", { lang: currentLang });
} catch {
  /* ignore */
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
