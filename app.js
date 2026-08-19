document.addEventListener('DOMContentLoaded', () => {
  // Navigation Transitions
  const landingPage = document.getElementById('landing-page');
  const appWrapper = document.getElementById('app-wrapper');
  const launchBtn = document.getElementById('launch-app-btn');
  const backBtn = document.getElementById('back-btn');

  launchBtn.addEventListener('click', () => {
    landingPage.style.opacity = '0';
    setTimeout(() => {
      landingPage.classList.add('view-hidden');
      appWrapper.classList.remove('view-hidden');
      document.body.classList.add('app-active');
    }, 300);
  });

  backBtn.addEventListener('click', () => {
    if (isScanning) stopScanner();
    appWrapper.classList.add('view-hidden');
    landingPage.classList.remove('view-hidden');
    document.body.classList.remove('app-active');
    setTimeout(() => { landingPage.style.opacity = '1'; }, 50);
  });

  // App Scanner & Search Logic
  const form = document.getElementById('search-form');
  const barcodeInput = document.getElementById('barcode-input');
  const chips = document.querySelectorAll('.chip');
  const loader = document.getElementById('loader');
  const errorMsg = document.getElementById('error-message');
  const dashboard = document.getElementById('results-dashboard');
  
  const cameraToggleBtn = document.getElementById('camera-toggle-btn');
  const readerContainer = document.getElementById('reader-container');
  let html5QrcodeScanner = null;
  let isScanning = false;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const barcode = barcodeInput.value.trim();
    if (barcode) {
      if (isScanning) stopScanner();
      analyzeProduct(barcode);
    }
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const upc = chip.dataset.upc;
      barcodeInput.value = upc;
      if (isScanning) stopScanner();
      analyzeProduct(upc);
    });
  });

  cameraToggleBtn.addEventListener('click', () => {
    isScanning ? stopScanner() : startScanner();
  });

  function startScanner() {
    readerContainer.classList.remove('hidden');
    cameraToggleBtn.textContent = '❌ Close Camera';
    isScanning = true;

    html5QrcodeScanner = new Html5Qrcode("reader");

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 150 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128
      ]
    };

    html5QrcodeScanner.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      () => {}
    ).catch(err => {
      showError("Unable to access camera. Please ensure permissions are granted.");
      stopScanner();
    });
  }

  function onScanSuccess(decodedText) {
    barcodeInput.value = decodedText;
    stopScanner();
    analyzeProduct(decodedText);
  }

  function stopScanner() {
    if (html5QrcodeScanner && isScanning) {
      html5QrcodeScanner.stop().then(() => {
        html5QrcodeScanner.clear();
        readerContainer.classList.add('hidden');
        cameraToggleBtn.textContent = '📷 Open Camera Scanner';
        isScanning = false;
      }).catch(err => console.error("Error stopping scanner:", err));
    }
  }

  async function analyzeProduct(barcode) {
    showLoading(true);
    hideError();
    dashboard.classList.add('hidden');

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      if (!res.ok) throw new Error('Network error connecting to database.');
      
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        throw new Error('Product not found in open database. Try one of the quick demo barcodes.');
      }

      renderAnalysis(data.product);
    } catch (err) {
      showError(err.message);
    } finally {
      showLoading(false);
    }
  }

  function renderAnalysis(product) {
    const name = product.product_name || 'Unknown Product';
    const brand = product.brands || 'Generic Brand';
    const imgUrl = product.image_front_small_url || 'https://via.placeholder.com/60?text=No+Image';
    const ingredients = (product.ingredients_text || '').toLowerCase();
    const nutriments = product.nutriments || {};

    let dosageScore = 85;
    let purityScore = 90;
    let transparencyScore = 80;
    const findings = [];

    const protein = nutriments['proteins_100g'] || 0;
    if (protein > 15) {
      dosageScore += 10;
      findings.push({ type: 'positive', text: `High protein density (~${Math.round(protein)}g per 100g).` });
    } else if (name.toLowerCase().includes('protein') && protein < 5) {
      dosageScore -= 25;
      findings.push({ type: 'negative', text: 'Low active protein content despite protein marketing claims.' });
    }

    if (ingredients.includes('sucralose') || ingredients.includes('acesulfame')) {
      purityScore -= 15;
      findings.push({ type: 'warning', text: 'Contains artificial sweeteners (Sucralose/Ace-K).' });
    } else if (ingredients.includes('stevia') || ingredients.includes('monk fruit')) {
      findings.push({ type: 'positive', text: 'Naturally sweetened with plant extracts.' });
    }

    if (ingredients.includes('blend') || ingredients.includes('matrix')) {
      transparencyScore -= 20;
      findings.push({ type: 'warning', text: 'Uses proprietary blend labeling, masking exact dosages.' });
    } else {
      findings.push({ type: 'positive', text: 'Fully disclosed ingredient panel.' });
    }

    const overallScore = Math.min(100, Math.max(0, Math.round((dosageScore * 0.4) + (purityScore * 0.4) + (transparencyScore * 0.2))));

    document.getElementById('product-title').textContent = name;
    document.getElementById('product-brand').textContent = brand;
    document.getElementById('product-img').src = imgUrl;

    const scoreValue = document.getElementById('score-value');
    scoreValue.textContent = overallScore;

    const scoreBadge = document.getElementById('score-badge');
    const verdictLabel = document.getElementById('verdict-label');
    const verdictDesc = document.getElementById('verdict-desc');

    if (overallScore >= 80) {
      scoreBadge.style.borderColor = 'var(--grade-green)';
      verdictLabel.textContent = 'Excellent Formulation';
      verdictDesc.textContent = 'Clean ingredient panel with effective dosages.';
    } else if (overallScore >= 60) {
      scoreBadge.style.borderColor = 'var(--grade-yellow)';
      verdictLabel.textContent = 'Moderate Quality';
      verdictDesc.textContent = 'Decent profile, but contains artificial additives or lower density.';
    } else {
      scoreBadge.style.borderColor = 'var(--grade-red)';
      verdictLabel.textContent = 'Low Efficacy / Hidden Blends';
      verdictDesc.textContent = 'Contains filler ingredients or underdosed active compounds.';
    }

    setMetric('dosage', Math.min(100, dosageScore));
    setMetric('purity', Math.min(100, purityScore));
    setMetric('transparency', Math.min(100, transparencyScore));

    const findingsList = document.getElementById('findings-list');
    findingsList.innerHTML = findings.map(f => `<li class="${f.type}">${f.text}</li>`).join('');

    const altCard = document.getElementById('alt-card');
    if (overallScore < 75) {
      altCard.classList.remove('hidden');
      document.getElementById('alt-title').textContent = 'Recommended Clean Upgrade';
      document.getElementById('alt-desc').textContent = 'Consider switching to an NSF Certified, naturally sweetened alternative for better bioavailability.';
    } else {
      altCard.classList.add('hidden');
    }

    dashboard.classList.remove('hidden');
  }

  function setMetric(id, value) {
    document.getElementById(`bar-${id}`).style.width = `${value}%`;
    document.getElementById(`val-${id}`).textContent = `${value}%`;
  }

  function showLoading(state) { loader.classList.toggle('hidden', !state); }
  function showError(msg) { errorMsg.textContent = msg; errorMsg.classList.remove('hidden'); }
  function hideError() { errorMsg.classList.add('hidden'); }
});
