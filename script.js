document.addEventListener('DOMContentLoaded', function() {
  // 定数・変数
  const textInput = document.getElementById('text-input');
  const fileInput = document.getElementById('file-input');
  const stopwordsInput = document.getElementById('stopwords-input');
  const autoStopwords = document.getElementById('auto-stopwords');
  const fontSizeSlider = document.getElementById('font-size');
  const fontSizeValue = document.getElementById('font-size-value');
  const colorTheme = document.getElementById('color-theme');
  const customColor = document.getElementById('custom-color');
  const topN = document.getElementById('top-n');
  const canvasWidth = document.getElementById('canvas-width');
  const canvasHeight = document.getElementById('canvas-height');
  const generateBtn = document.getElementById('generate-btn');
  const downloadBtn = document.getElementById('download-btn');
  const canvas = document.getElementById('wordcloud-canvas');
  const presetSelect = document.getElementById('preset-select');
  const savePresetBtn = document.getElementById('save-preset-btn');
  const presetNameInput = document.getElementById('preset-name');

  // よくある助詞リスト
  const commonStopwords = ['の','に','は','が','を','です','ます','こと','よう'];

  // カラーテーマ定義
  const colorThemes = {
    monochrome: ['#000000', '#333333', '#666666'],
    pastel: ['#FFD1DC', '#FFE4E1', '#E6E6FA', '#DDA0DD', '#BA55D3'],
    colorful: ['#FF6347', '#4682B4', '#32CD32', '#FFD700', '#9370DB'],
    'random-dark': null,
    'random-light': null,
  };

  // プリセット定義
  const presets = {
    default: {
      fontSize: 5,
      colorTheme: 'colorful',
      topN: 50,
      canvasWidth: 800,
      canvasHeight: 600,
      autoStopwords: true,
    },
    presentation: {
      fontSize: 8,
      colorTheme: 'random-dark',
      topN: 30,
      canvasWidth: 1200,
      canvasHeight: 800,
      autoStopwords: true,
    },
    minimal: {
      fontSize: 3,
      colorTheme: 'monochrome',
      topN: 20,
      canvasWidth: 600,
      canvasHeight: 400,
      autoStopwords: true,
    },
  };

  // Kuromojiの初期化
  let tokenizer = null;
  async function initKuromoji() {
    tokenizer = kuromoji.builder({
      dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/"
    }).build((err, _tokenizer) => {
      tokenizer = _tokenizer;
    });
  }

  // 形態素解析で名詞を抽出
  async function extractNouns(text) {
    if (!tokenizer) {
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (tokenizer) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    }

    return new Promise((resolve) => {
      const tokens = tokenizer.tokenize(text);
      const nouns = tokens
        .filter(token => token.pos === '名詞' && token.pos_detail_1 !== '非自立')
        .map(token => token.surface_form);
      resolve(nouns);
    });
  }

  // イベントリスナー
  fontSizeSlider.addEventListener('input', () => {
    fontSizeValue.textContent = fontSizeSlider.value;
  });

  colorTheme.addEventListener('change', () => {
    customColor.style.display = colorTheme.value === 'custom' ? 'inline-block' : 'none';
  });

  // プリセット読み込み
  function loadPreset(name) {
    if (!presets[name]) return;
    const p = presets[name];
    fontSizeSlider.value = p.fontSize;
    fontSizeValue.textContent = p.fontSize;
    colorTheme.value = p.colorTheme;
    topN.value = p.topN;
    canvasWidth.value = p.canvasWidth;
    canvasHeight.value = p.canvasHeight;
    autoStopwords.checked = p.autoStopwords;
    colorTheme.dispatchEvent(new Event('change'));
  }

  // プリセット保存
  savePresetBtn.addEventListener('click', () => {
    if (savePresetBtn.textContent === '現在の設定を保存') {
      presetNameInput.style.display = 'block';
      savePresetBtn.textContent = '確定';
    } else {
      const name = presetNameInput.value.trim();
      if (name) {
        presets[name] = {
          fontSize: parseInt(fontSizeSlider.value),
          colorTheme: colorTheme.value,
          topN: parseInt(topN.value),
          canvasWidth: parseInt(canvasWidth.value),
          canvasHeight: parseInt(canvasHeight.value),
          autoStopwords: autoStopwords.checked,
        };
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        presetSelect.appendChild(option);
        presetSelect.value = name;
        presetNameInput.value = '';
        presetNameInput.style.display = 'none';
        savePresetBtn.textContent = '現在の設定を保存';
        alert('プリセットを保存しました！');
      }
    }
  });

  // プリセット選択時
  presetSelect.addEventListener('change', () => {
    loadPreset(presetSelect.value);
  });

  // ワードクラウド生成関数
  async function generateWordCloud() {
    let text = textInput.value;
    if (!text) {
      const file = fileInput.files[0];
      if (file) {
        text = await file.text();
      } else {
        alert('テキストまたはファイルを入力してください。');
        return;
      }
    }

    // ストップワード処理
    let stopwords = stopwordsInput.value.split(/[,\n]/).filter(w => w.trim());
    if (autoStopwords.checked) {
      stopwords = [...stopwords, ...commonStopwords];
    }

    // 形態素解析で名詞を抽出
    const nouns = await extractNouns(text);
    const words = nouns.filter(word => word && !stopwords.includes(word) && word.length > 1);

    // 頻度計算
    const freq = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });

    // トップN抽出
    const topWords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, parseInt(topN.value));

    // wordcloud2.js 用データ
    const list = topWords.map(([word, count]) => [word, count]);

    // カラーテーマ選択
    let colors = colorThemes[colorTheme.value];
    if (colorTheme.value === 'custom') {
      colors = [customColor.value];
    }

    // Canvasサイズ設定
    canvas.width = parseInt(canvasWidth.value);
    canvas.height = parseInt(canvasHeight.value);

    // ワードクラウド描画
    WordCloud(canvas, {
      list: list,
      gridSize: Math.round(16 * 1440 / canvas.width),
      weightFactor: parseInt(fontSizeSlider.value),
      color: colors ? (word, weight) => colors[Math.floor(Math.random() * colors.length)] : undefined,
      rotateRatio: 0.5,
      backgroundColor: '#ffffff',
    });
  }

  // PNGダウンロード関数
  function downloadPNG() {
    const link = document.createElement('a');
    link.download = `wordcloud_${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // 初期化時にプリセットオプションを設定
  function initPresetOptions() {
    Object.keys(presets).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      presetSelect.appendChild(option);
    });
  }

  // イベントリスナー登録
  generateBtn.addEventListener('click', generateWordCloud);
  downloadBtn.addEventListener('click', downloadPNG);

  // 初期化
  initKuromoji();
  initPresetOptions();
});
