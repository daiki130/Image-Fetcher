/**
 * 多言語メッセージ辞書（ja / en / fr / ko）
 *
 * UI 側・main 側のどちらからも共通で参照する。
 * テンプレ変数は `{name}` 形式で記述し、`translate()` の引数 `params` で差し込む。
 */

export const SUPPORTED_LANGS = ["ja", "en", "fr", "ko"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: Lang = "ja";

/** 言語選択 UI に表示するラベル（言語切替メニュー用） */
export const LANG_LABELS: Record<Lang, string> = {
  ja: "日本語",
  en: "English",
  fr: "Français",
  ko: "한국어",
};

/**
 * 各キーの翻訳テーブル。
 * `Translations` 型から、利用可能なキーを TypeScript で補完できる。
 */
const ja = {
  // 共通
  "common.apply": "適用",
  "common.remove": "削除",
  "common.all": "すべて",
  "common.search": "検索",
  "common.top": "Top",
  "common.dummy": "Dummy",
  "common.images": "枚",
  "common.unknownError": "不明なエラー",

  // ステータス（UI 側）
  "ui.imageAddedToFigma": "画像をFigmaに追加しました",
  "ui.savedImagesLoaded": "{n}個の保存された画像を読み込みました",
  "ui.pleaseEnterData": "データを入力してください",
  "ui.decryptingData": "データを復号化中...",
  "ui.dataDecryptionFailed":
    "データの復号化に失敗しました。ファイルが正しい形式か確認してください",
  "ui.decryptionError": "復号化エラー: {msg}",
  "ui.invalidImageArray": "有効な画像配列を入力してください",
  "ui.imagesAdded": "{added}個の画像を追加しました（合計: {total}個）",
  "ui.imagesAlreadyAdded":
    "すべての画像は既に追加されています（合計: {total}個）",
  "ui.dataLoadError": "データ読み込みエラー: {msg}",
  "ui.applyingToFrame": "フレームに適用中...",
  "ui.applyFailed": "適用に失敗しました",
  "ui.error": "エラー: {msg}",
  "ui.selectImagesForFrame": "フレームに入れる画像を選択してください",
  "ui.noImagesToPlace": "配置する画像がありません",
  "ui.processingImage": "画像を処理中...",
  "ui.processingImageProgress": "画像を処理中... ({i}/{total})",
  "ui.imagesPlacedInFrame": "{count}個の画像をフレーム内に配置しました",
  "ui.noImagesToApply": "配置できる画像がありませんでした",
  "ui.convertingBase64": "base64データを変換中...",
  "ui.downloadingImage": "画像をダウンロード中...",
  "ui.convertingWebpToPng": "WebPをPNGに変換中...",
  "ui.onlyImageFetcherFiles": ".imagefetcherファイルのみ読み込めます",
  "ui.readingFile": "ファイルを読み込み中...",
  "ui.fileEmpty": "ファイルが空です",
  "ui.fileReadFailed": "ファイルの読み込みに失敗しました: {msg}",
  "ui.serviceImagesDeleted": "{service}の{count}個の画像を削除しました",
  "ui.noImagesToDelete": "削除する画像が見つかりませんでした",
  "ui.imagesDeselected": "{count}件の画像の選択を解除しました",
  "ui.imagesSelected": "{count}件の画像を選択しました",

  // 文言（UI 表示用）
  "ui.loadingData": "データを読み込み中...",
  "ui.dropAreaLine1": "ドラッグ&ドロップ または クリックして",
  "ui.dropAreaLine2": "",
  "ui.dropAreaSuffix": " ファイルをアップロード",
  "ui.selectAllImages": "すべての画像を選択",
  "ui.searchPlaceholder": "検索",
  "ui.imagesCountLabel": "{count} 枚",
  "ui.noSearchMatch": "検索に一致する画像がありません",
  "ui.noImagesToShow": "表示する画像がありません",
  "ui.matchAspectRatio": "アスペクト比をマッチ",
  "ui.applying": "適用中...",
  "ui.progressItems": "{total} 件中 {current} 件",
  "ui.progressDone": " が処理完了",
  "ui.progressContinuing": "（続けて処理中…）",
  "ui.applyImageLoadingTitle": "画像適用ローディング",
  "ui.dummyTextLabel": "ダミーテキスト",
  "ui.dummyTextDesc":
    "選択した要素のテキストを、元の文字数のまま指定した文字で埋めます",
  "ui.dummyTextPlaceholder": "テキスト",
  "ui.maskImageLabel": "マスク画像",
  "ui.maskImageDesc": "選択した要素の画像要素にマスクを設定することができます",
  "ui.settings": "設定",
  "ui.noImageSizes": "画像サイズがありません",
  "ui.sizeTooltip": "サイズ",
  "ui.selectImagesAndElements": "画像・要素を選択してください",
  "ui.selectElement": "要素を選択してください",
  "ui.selectFrame": "フレームを選択してください",
  "ui.selectImage": "画像を選択してください",
  "ui.applyToSelectedNode": "選択ノードに画像を適用",
  "ui.createNewRectangle": "新規レクタングルを作成",
  "ui.appliedTextItems": "テキスト{count}件",
  "ui.appliedMaskItems": "マスク色{count}箇所",
  "ui.skippedProtected": "（数字・記号を含む{count}件はスキップ）",
  "ui.appliedSummary": "{parts}を適用しました{skipHint}",
  "ui.languageMenu": "言語",

  // main.ts（figma.notify 用）
  "main.imagesSaved": "{count}個の画像を保存しました",
  "main.saveError": "保存エラー: {msg}",
  "main.loadError": "読み込みエラー: {msg}",
  "main.selectNode": "ノードを選択してください",
  "main.dummyTextReplaced": "{count}件のテキストをダミーに置き換えました",
  "main.dummyTextSkipped":
    "数字や記号を含むテキストは置換しませんでした（該当しないテキストを選択してください）",
  "main.noTextSelected": "テキストレイヤーが選択されていません",
  "main.selectFrame": "フレームを選択してください",
  "main.dummyOrMaskRequired":
    "Dummy Text か Mask Image のどちらかを ON にしてください",
  "main.skipHintProtected":
    "（数字・記号を含む{count}件のテキストはスキップ）",
  "main.partsTextDummyReplaced": "テキスト{count}件をダミーに置換",
  "main.partsMaskColorApplied": "マスク色を{count}箇所に適用",
  "main.partsImageApplied": "画像を{count}箇所に適用",
  "main.partsApplied": "{parts}しました{skipHint}",
  "main.partsAppliedWithFailure":
    "{parts}。画像は適用できませんでした（{error}）",
  "main.noImageData": "画像データがありません",
  "main.selectFrameOrShape":
    "画像を適用するフレーム・コンポーネント・シェイプを選択してください",
  "main.appliedToExistingNodes": "{count}個の既存ノードに画像を適用しました",
  "main.noTargetElement":
    "画像を適用できる要素が見つかりませんでした。画像プレースホルダー（img、画像などの名前が含まれる要素）を用意するか、画像を入れたい Rectangle / コンポーネント / シェイプを直接選択してください。",
  "main.imagesAppliedToElements":
    "{count}個の画像を既存の要素に適用しました",
  "main.cannotApplyToElements": "画像を適用できる要素が見つかりませんでした",
  "main.placedImage": "画像を配置しました",
  "main.appliedToNodes": "{count}個のノードに画像を適用しました",
  "main.cannotApplyToNodes": "画像を適用できるノードがありませんでした",
  "main.error": "エラー: {msg}",
};

export type TranslationKey = keyof typeof ja;
type Dict = Record<TranslationKey, string>;

const en: Dict = {
  "common.apply": "Apply",
  "common.remove": "Remove",
  "common.all": "All",
  "common.search": "Search",
  "common.top": "Top",
  "common.dummy": "Dummy",
  "common.images": "images",
  "common.unknownError": "Unknown error",

  "ui.imageAddedToFigma": "Image added to Figma",
  "ui.savedImagesLoaded": "Loaded {n} saved image(s)",
  "ui.pleaseEnterData": "Please enter data",
  "ui.decryptingData": "Decrypting data...",
  "ui.dataDecryptionFailed":
    "Failed to decrypt data. Please make sure the file is in the correct format.",
  "ui.decryptionError": "Decryption error: {msg}",
  "ui.invalidImageArray": "Please provide a valid image array",
  "ui.imagesAdded": "Added {added} image(s) (total: {total})",
  "ui.imagesAlreadyAdded": "All images are already added (total: {total})",
  "ui.dataLoadError": "Data load error: {msg}",
  "ui.applyingToFrame": "Applying to frame...",
  "ui.applyFailed": "Failed to apply",
  "ui.error": "Error: {msg}",
  "ui.selectImagesForFrame": "Select images to place in the frame",
  "ui.noImagesToPlace": "No images to place",
  "ui.processingImage": "Processing image...",
  "ui.processingImageProgress": "Processing image... ({i}/{total})",
  "ui.imagesPlacedInFrame": "Placed {count} image(s) in the frame",
  "ui.noImagesToApply": "No images could be placed",
  "ui.convertingBase64": "Converting base64 data...",
  "ui.downloadingImage": "Downloading image...",
  "ui.convertingWebpToPng": "Converting WebP to PNG...",
  "ui.onlyImageFetcherFiles": "Only .imagefetcher files are supported",
  "ui.readingFile": "Reading file...",
  "ui.fileEmpty": "The file is empty",
  "ui.fileReadFailed": "Failed to read file: {msg}",
  "ui.serviceImagesDeleted": "Deleted {count} image(s) from {service}",
  "ui.noImagesToDelete": "No images found to delete",
  "ui.imagesDeselected": "Deselected {count} image(s)",
  "ui.imagesSelected": "Selected {count} image(s)",

  "ui.loadingData": "Loading data...",
  "ui.dropAreaLine1": "Drag-and-drop or click to",
  "ui.dropAreaLine2": " upload a ",
  "ui.dropAreaSuffix": " file",
  "ui.selectAllImages": "Select all images",
  "ui.searchPlaceholder": "Search",
  "ui.imagesCountLabel": "{count} images",
  "ui.noSearchMatch": "No images match your search",
  "ui.noImagesToShow": "No images to show",
  "ui.matchAspectRatio": "Match aspect ratio",
  "ui.applying": "Applying...",
  "ui.progressItems": "{current} of {total}",
  "ui.progressDone": " processed",
  "ui.progressContinuing": " (continuing…)",
  "ui.applyImageLoadingTitle": "Image apply loading",
  "ui.dummyTextLabel": "Dummy Text",
  "ui.dummyTextDesc":
    "Replace text in selected elements with the specified character, keeping the original character count.",
  "ui.dummyTextPlaceholder": "Text",
  "ui.maskImageLabel": "Mask Image",
  "ui.maskImageDesc": "Apply a mask to image elements within the selection.",
  "ui.settings": "Settings",
  "ui.noImageSizes": "No image sizes available",
  "ui.sizeTooltip": "Size",
  "ui.selectImagesAndElements": "Please select images and an element",
  "ui.selectElement": "Please select an element",
  "ui.selectFrame": "Please select a frame",
  "ui.selectImage": "Please select an image",
  "ui.applyToSelectedNode": "Apply image to selected node",
  "ui.createNewRectangle": "Create a new rectangle",
  "ui.appliedTextItems": "{count} text item(s)",
  "ui.appliedMaskItems": "{count} mask area(s)",
  "ui.skippedProtected":
    " ({count} item(s) containing digits or symbols were skipped)",
  "ui.appliedSummary": "Applied {parts}{skipHint}",
  "ui.languageMenu": "Language",

  "main.imagesSaved": "Saved {count} image(s)",
  "main.saveError": "Save error: {msg}",
  "main.loadError": "Load error: {msg}",
  "main.selectNode": "Please select a node",
  "main.dummyTextReplaced": "Replaced {count} text item(s) with dummy text",
  "main.dummyTextSkipped":
    "Text containing digits or symbols was not replaced. Please select text that doesn't include them.",
  "main.noTextSelected": "No text layer is selected",
  "main.selectFrame": "Please select a frame",
  "main.dummyOrMaskRequired": "Turn on either Dummy Text or Mask Image",
  "main.skipHintProtected":
    " ({count} text item(s) containing digits or symbols were skipped)",
  "main.partsTextDummyReplaced": "replaced {count} text item(s) with dummy",
  "main.partsMaskColorApplied": "applied mask color to {count} area(s)",
  "main.partsImageApplied": "applied images to {count} area(s)",
  "main.partsApplied": "{parts}{skipHint}",
  "main.partsAppliedWithFailure":
    "{parts}. Could not apply images ({error})",
  "main.noImageData": "No image data",
  "main.selectFrameOrShape":
    "Please select a frame, component, or shape to apply images to",
  "main.appliedToExistingNodes":
    "Applied images to {count} existing node(s)",
  "main.noTargetElement":
    "No element to apply images to. Prepare an image placeholder (an element whose name contains 'img', '画像', etc.) or directly select a Rectangle, component, or shape.",
  "main.imagesAppliedToElements":
    "Applied {count} image(s) to existing elements",
  "main.cannotApplyToElements": "No element to apply images to",
  "main.placedImage": "Image placed",
  "main.appliedToNodes": "Applied images to {count} node(s)",
  "main.cannotApplyToNodes": "No nodes to apply images to",
  "main.error": "Error: {msg}",
};

const fr: Dict = {
  "common.apply": "Appliquer",
  "common.remove": "Supprimer",
  "common.all": "Tout",
  "common.search": "Rechercher",
  "common.top": "Top",
  "common.dummy": "Démo",
  "common.images": "images",
  "common.unknownError": "Erreur inconnue",

  "ui.imageAddedToFigma": "Image ajoutée à Figma",
  "ui.savedImagesLoaded": "{n} image(s) enregistrée(s) chargée(s)",
  "ui.pleaseEnterData": "Veuillez saisir les données",
  "ui.decryptingData": "Déchiffrement des données…",
  "ui.dataDecryptionFailed":
    "Échec du déchiffrement. Vérifiez que le fichier est au bon format.",
  "ui.decryptionError": "Erreur de déchiffrement : {msg}",
  "ui.invalidImageArray": "Veuillez fournir un tableau d'images valide",
  "ui.imagesAdded": "{added} image(s) ajoutée(s) (total : {total})",
  "ui.imagesAlreadyAdded":
    "Toutes les images sont déjà ajoutées (total : {total})",
  "ui.dataLoadError": "Erreur de chargement : {msg}",
  "ui.applyingToFrame": "Application au cadre…",
  "ui.applyFailed": "Échec de l'application",
  "ui.error": "Erreur : {msg}",
  "ui.selectImagesForFrame":
    "Sélectionnez les images à placer dans le cadre",
  "ui.noImagesToPlace": "Aucune image à placer",
  "ui.processingImage": "Traitement de l'image…",
  "ui.processingImageProgress": "Traitement de l'image… ({i}/{total})",
  "ui.imagesPlacedInFrame": "{count} image(s) placée(s) dans le cadre",
  "ui.noImagesToApply": "Aucune image n'a pu être placée",
  "ui.convertingBase64": "Conversion des données base64…",
  "ui.downloadingImage": "Téléchargement de l'image…",
  "ui.convertingWebpToPng": "Conversion WebP vers PNG…",
  "ui.onlyImageFetcherFiles":
    "Seuls les fichiers .imagefetcher sont pris en charge",
  "ui.readingFile": "Lecture du fichier…",
  "ui.fileEmpty": "Le fichier est vide",
  "ui.fileReadFailed": "Échec de la lecture du fichier : {msg}",
  "ui.serviceImagesDeleted":
    "{count} image(s) supprimée(s) de {service}",
  "ui.noImagesToDelete": "Aucune image à supprimer",
  "ui.imagesDeselected": "{count} image(s) désélectionnée(s)",
  "ui.imagesSelected": "{count} image(s) sélectionnée(s)",

  "ui.loadingData": "Chargement des données…",
  "ui.dropAreaLine1": "Glissez-déposez ou cliquez pour",
  "ui.dropAreaLine2": " importer un fichier ",
  "ui.dropAreaSuffix": "",
  "ui.selectAllImages": "Sélectionner toutes les images",
  "ui.searchPlaceholder": "Rechercher",
  "ui.imagesCountLabel": "{count} images",
  "ui.noSearchMatch": "Aucune image ne correspond à votre recherche",
  "ui.noImagesToShow": "Aucune image à afficher",
  "ui.matchAspectRatio": "Conserver le ratio",
  "ui.applying": "Application…",
  "ui.progressItems": "{current} sur {total}",
  "ui.progressDone": " traitée(s)",
  "ui.progressContinuing": " (en cours…)",
  "ui.applyImageLoadingTitle": "Chargement de l'application d'image",
  "ui.dummyTextLabel": "Texte de démo",
  "ui.dummyTextDesc":
    "Remplit le texte des éléments sélectionnés avec le caractère choisi en conservant le nombre de caractères.",
  "ui.dummyTextPlaceholder": "Texte",
  "ui.maskImageLabel": "Masque d'image",
  "ui.maskImageDesc":
    "Permet d'appliquer un masque sur les images dans la sélection.",
  "ui.settings": "Réglages",
  "ui.noImageSizes": "Aucune taille d'image disponible",
  "ui.sizeTooltip": "Taille",
  "ui.selectImagesAndElements":
    "Veuillez sélectionner des images et un élément",
  "ui.selectElement": "Veuillez sélectionner un élément",
  "ui.selectFrame": "Veuillez sélectionner un cadre",
  "ui.selectImage": "Veuillez sélectionner une image",
  "ui.applyToSelectedNode": "Appliquer l'image au nœud sélectionné",
  "ui.createNewRectangle": "Créer un nouveau rectangle",
  "ui.appliedTextItems": "{count} texte(s)",
  "ui.appliedMaskItems": "{count} zone(s) de masque",
  "ui.skippedProtected":
    " ({count} élément(s) contenant des chiffres ou symboles ignoré(s))",
  "ui.appliedSummary": "Appliqué : {parts}{skipHint}",
  "ui.languageMenu": "Langue",

  "main.imagesSaved": "{count} image(s) enregistrée(s)",
  "main.saveError": "Erreur d'enregistrement : {msg}",
  "main.loadError": "Erreur de chargement : {msg}",
  "main.selectNode": "Veuillez sélectionner un nœud",
  "main.dummyTextReplaced":
    "{count} texte(s) remplacé(s) par du texte de démo",
  "main.dummyTextSkipped":
    "Les textes contenant des chiffres ou symboles n'ont pas été remplacés (sélectionnez un texte qui n'en contient pas).",
  "main.noTextSelected": "Aucun calque de texte n'est sélectionné",
  "main.selectFrame": "Veuillez sélectionner un cadre",
  "main.dummyOrMaskRequired":
    "Activez Dummy Text ou Mask Image",
  "main.skipHintProtected":
    " ({count} texte(s) contenant des chiffres ou symboles ignoré(s))",
  "main.partsTextDummyReplaced":
    "{count} texte(s) remplacé(s) par du texte de démo",
  "main.partsMaskColorApplied":
    "couleur de masque appliquée à {count} zone(s)",
  "main.partsImageApplied": "images appliquées à {count} zone(s)",
  "main.partsApplied": "{parts}{skipHint}",
  "main.partsAppliedWithFailure":
    "{parts}. Impossible d'appliquer les images ({error})",
  "main.noImageData": "Aucune donnée d'image",
  "main.selectFrameOrShape":
    "Veuillez sélectionner un cadre, un composant ou une forme pour y appliquer les images",
  "main.appliedToExistingNodes":
    "Images appliquées à {count} nœud(s) existant(s)",
  "main.noTargetElement":
    "Aucun élément cible pour appliquer les images. Préparez un placeholder d'image (élément dont le nom contient 'img', '画像', etc.) ou sélectionnez directement un Rectangle, un composant ou une forme.",
  "main.imagesAppliedToElements":
    "{count} image(s) appliquée(s) aux éléments existants",
  "main.cannotApplyToElements":
    "Aucun élément cible pour appliquer les images",
  "main.placedImage": "Image placée",
  "main.appliedToNodes": "Images appliquées à {count} nœud(s)",
  "main.cannotApplyToNodes": "Aucun nœud sur lequel appliquer les images",
  "main.error": "Erreur : {msg}",
};

const ko: Dict = {
  "common.apply": "적용",
  "common.remove": "삭제",
  "common.all": "전체",
  "common.search": "검색",
  "common.top": "Top",
  "common.dummy": "Dummy",
  "common.images": "장",
  "common.unknownError": "알 수 없는 오류",

  "ui.imageAddedToFigma": "이미지를 Figma에 추가했습니다",
  "ui.savedImagesLoaded": "저장된 이미지 {n}개를 불러왔습니다",
  "ui.pleaseEnterData": "데이터를 입력해 주세요",
  "ui.decryptingData": "데이터를 복호화하는 중…",
  "ui.dataDecryptionFailed":
    "데이터 복호화에 실패했습니다. 파일 형식이 올바른지 확인해 주세요.",
  "ui.decryptionError": "복호화 오류: {msg}",
  "ui.invalidImageArray": "유효한 이미지 배열을 입력해 주세요",
  "ui.imagesAdded": "{added}개의 이미지를 추가했습니다(총 {total}개)",
  "ui.imagesAlreadyAdded":
    "모든 이미지가 이미 추가되어 있습니다(총 {total}개)",
  "ui.dataLoadError": "데이터 로딩 오류: {msg}",
  "ui.applyingToFrame": "프레임에 적용하는 중…",
  "ui.applyFailed": "적용에 실패했습니다",
  "ui.error": "오류: {msg}",
  "ui.selectImagesForFrame":
    "프레임에 넣을 이미지를 선택해 주세요",
  "ui.noImagesToPlace": "배치할 이미지가 없습니다",
  "ui.processingImage": "이미지를 처리하는 중…",
  "ui.processingImageProgress": "이미지를 처리하는 중… ({i}/{total})",
  "ui.imagesPlacedInFrame": "{count}개의 이미지를 프레임에 배치했습니다",
  "ui.noImagesToApply": "배치 가능한 이미지가 없습니다",
  "ui.convertingBase64": "base64 데이터를 변환하는 중…",
  "ui.downloadingImage": "이미지를 다운로드하는 중…",
  "ui.convertingWebpToPng": "WebP를 PNG로 변환하는 중…",
  "ui.onlyImageFetcherFiles":
    ".imagefetcher 파일만 불러올 수 있습니다",
  "ui.readingFile": "파일을 읽는 중…",
  "ui.fileEmpty": "파일이 비어 있습니다",
  "ui.fileReadFailed": "파일 읽기에 실패했습니다: {msg}",
  "ui.serviceImagesDeleted":
    "{service}의 이미지 {count}개를 삭제했습니다",
  "ui.noImagesToDelete": "삭제할 이미지를 찾을 수 없습니다",
  "ui.imagesDeselected": "{count}개의 이미지 선택을 해제했습니다",
  "ui.imagesSelected": "{count}개의 이미지를 선택했습니다",

  "ui.loadingData": "데이터를 불러오는 중…",
  "ui.dropAreaLine1": "드래그 앤 드롭 또는 클릭하여",
  "ui.dropAreaLine2": "",
  "ui.dropAreaSuffix": " 파일을 업로드",
  "ui.selectAllImages": "모든 이미지 선택",
  "ui.searchPlaceholder": "검색",
  "ui.imagesCountLabel": "{count}장",
  "ui.noSearchMatch": "검색과 일치하는 이미지가 없습니다",
  "ui.noImagesToShow": "표시할 이미지가 없습니다",
  "ui.matchAspectRatio": "가로세로 비율 맞추기",
  "ui.applying": "적용 중…",
  "ui.progressItems": "{total}건 중 {current}건",
  "ui.progressDone": " 처리 완료",
  "ui.progressContinuing": "(계속 처리 중…)",
  "ui.applyImageLoadingTitle": "이미지 적용 로딩",
  "ui.dummyTextLabel": "더미 텍스트",
  "ui.dummyTextDesc":
    "선택한 요소의 텍스트를 원래 글자 수를 유지한 채 지정한 문자로 채웁니다",
  "ui.dummyTextPlaceholder": "텍스트",
  "ui.maskImageLabel": "마스크 이미지",
  "ui.maskImageDesc": "선택한 요소의 이미지에 마스크를 적용할 수 있습니다",
  "ui.settings": "설정",
  "ui.noImageSizes": "이미지 크기가 없습니다",
  "ui.sizeTooltip": "크기",
  "ui.selectImagesAndElements": "이미지와 요소를 선택해 주세요",
  "ui.selectElement": "요소를 선택해 주세요",
  "ui.selectFrame": "프레임을 선택해 주세요",
  "ui.selectImage": "이미지를 선택해 주세요",
  "ui.applyToSelectedNode": "선택한 노드에 이미지 적용",
  "ui.createNewRectangle": "새 사각형 만들기",
  "ui.appliedTextItems": "텍스트 {count}건",
  "ui.appliedMaskItems": "마스크 {count}곳",
  "ui.skippedProtected":
    "(숫자·기호가 포함된 {count}건은 건너뜀)",
  "ui.appliedSummary": "{parts}을(를) 적용했습니다{skipHint}",
  "ui.languageMenu": "언어",

  "main.imagesSaved": "이미지 {count}개를 저장했습니다",
  "main.saveError": "저장 오류: {msg}",
  "main.loadError": "로딩 오류: {msg}",
  "main.selectNode": "노드를 선택해 주세요",
  "main.dummyTextReplaced":
    "{count}건의 텍스트를 더미로 교체했습니다",
  "main.dummyTextSkipped":
    "숫자나 기호가 포함된 텍스트는 교체하지 않았습니다(해당하지 않는 텍스트를 선택해 주세요).",
  "main.noTextSelected": "텍스트 레이어가 선택되지 않았습니다",
  "main.selectFrame": "프레임을 선택해 주세요",
  "main.dummyOrMaskRequired":
    "Dummy Text 또는 Mask Image 중 하나를 켜 주세요",
  "main.skipHintProtected":
    "(숫자·기호가 포함된 텍스트 {count}건은 건너뜀)",
  "main.partsTextDummyReplaced":
    "텍스트 {count}건을 더미로 교체",
  "main.partsMaskColorApplied":
    "마스크 색상을 {count}곳에 적용",
  "main.partsImageApplied": "이미지를 {count}곳에 적용",
  "main.partsApplied": "{parts}했습니다{skipHint}",
  "main.partsAppliedWithFailure":
    "{parts}. 이미지는 적용할 수 없었습니다({error})",
  "main.noImageData": "이미지 데이터가 없습니다",
  "main.selectFrameOrShape":
    "이미지를 적용할 프레임·컴포넌트·셰이프를 선택해 주세요",
  "main.appliedToExistingNodes":
    "기존 노드 {count}개에 이미지를 적용했습니다",
  "main.noTargetElement":
    "이미지를 적용할 요소를 찾을 수 없습니다. 이미지 플레이스홀더(이름에 'img', '画像' 등이 포함된 요소)를 준비하거나 Rectangle / 컴포넌트 / 셰이프를 직접 선택해 주세요.",
  "main.imagesAppliedToElements":
    "{count}개의 이미지를 기존 요소에 적용했습니다",
  "main.cannotApplyToElements":
    "이미지를 적용할 요소를 찾을 수 없습니다",
  "main.placedImage": "이미지를 배치했습니다",
  "main.appliedToNodes": "{count}개의 노드에 이미지를 적용했습니다",
  "main.cannotApplyToNodes":
    "이미지를 적용할 수 있는 노드가 없습니다",
  "main.error": "오류: {msg}",
};

export const MESSAGES: Record<Lang, Dict> = { ja, en, fr, ko };

/**
 * UI / main の双方から使える翻訳関数。
 * 該当キーが見つからない場合は日本語にフォールバックする。
 */
export function translate(
  lang: Lang,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dict = MESSAGES[lang] ?? MESSAGES[DEFAULT_LANG];
  const template = dict[key] ?? MESSAGES[DEFAULT_LANG][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = params[name];
    return value == null ? `{${name}}` : String(value);
  });
}

/**
 * `data.tsx` 等で `Date.toLocaleString` に渡す BCP 47 ロケール。
 */
export function dateLocale(lang: Lang): string {
  switch (lang) {
    case "ja":
      return "ja-JP";
    case "en":
      return "en-US";
    case "fr":
      return "fr-FR";
    case "ko":
      return "ko-KR";
  }
}
