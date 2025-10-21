// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyD95fWK3EDDd9hNgm5YEJok38awEHtidcg",
  authDomain: "sitevalidacao-12b9d.firebaseapp.com",
  projectId: "sitevalidacao-12b9d",
  storageBucket: "sitevalidacao-12b9d.firebasestorage.app",
  messagingSenderId: "738208690621",
  appId: "1:738208690621:web:7e151dd7548c9ced0262d4",
  measurementId: "G-RFQ5BGW08T"
};

// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let referenceCanvas, referenceCtx
let validateCanvas, validateCtx
let allSignatures = []
let uploadedSignatureData = null
let referenceSignatureData = null

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  initializeTabs()
  initializeCanvases()
  initializeEventListeners()
})

// ============================================
// GERENCIAMENTO DE TABS
// ============================================
function initializeTabs() {
  const tabButtons = document.querySelectorAll(".tab-button")
  const tabContents = document.querySelectorAll(".tab-content")

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabName = button.getAttribute("data-tab")

      tabButtons.forEach((btn) => btn.classList.remove("active"))
      tabContents.forEach((content) => content.classList.remove("active"))

      button.classList.add("active")
      document.getElementById(`${tabName}-tab`).classList.add("active")

      clearMessages()
    })
  })
}

// ============================================
// CONFIGURAÇÃO DOS CANVAS
// ============================================
function initializeCanvases() {
  referenceCanvas = document.getElementById("reference-canvas")
  referenceCtx = referenceCanvas.getContext("2d")
  referenceCanvas.width = 400
  referenceCanvas.height = 200

  validateCanvas = document.getElementById("validate-canvas")
  validateCtx = validateCanvas.getContext("2d")
  validateCanvas.width = 400
  validateCanvas.height = 200
}

// ============================================
// EVENT LISTENERS
// ============================================
function initializeEventListeners() {
  // Upload de assinatura para salvar
  const uploadArea = document.getElementById("upload-area")
  const fileInput = document.getElementById("signature-upload")

  uploadArea.addEventListener("click", () => fileInput.click())

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault()
    uploadArea.classList.add("dragover")
  })

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover")
  })

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault()
    uploadArea.classList.remove("dragover")
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      handleFileUpload(file, "save")
    }
  })

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileUpload(file, "save")
    }
  })

  // Upload de assinatura para validar
  const validateUploadArea = document.getElementById("validate-upload-area")
  const validateFileInput = document.getElementById("validate-signature-upload")

  validateUploadArea.addEventListener("click", () => validateFileInput.click())

  validateUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault()
    validateUploadArea.classList.add("dragover")
  })

  validateUploadArea.addEventListener("dragleave", () => {
    validateUploadArea.classList.remove("dragover")
  })

  validateUploadArea.addEventListener("drop", (e) => {
    e.preventDefault()
    validateUploadArea.classList.remove("dragover")
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      handleFileUpload(file, "validate")
    }
  })

  validateFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileUpload(file, "validate")
    }
  })

  // Botão de salvar
  document.getElementById("save-signature-btn").addEventListener("click", saveSignature)

  // Autocomplete
  const validateNameInput = document.getElementById("validate-name")
  validateNameInput.addEventListener("input", handleAutocomplete)
  validateNameInput.addEventListener("focus", handleAutocomplete)

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".autocomplete-container")) {
      document.getElementById("autocomplete-list").classList.remove("active")
    }
  })
}

// ============================================
// MANIPULAÇÃO DE UPLOAD DE ARQUIVOS
// ============================================
function handleFileUpload(file, type) {
  const reader = new FileReader()

  reader.onload = (e) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (type === "save") {
        // Mostrar preview
        const preview = document.getElementById("signature-preview")
        const previewContainer = document.getElementById("preview-container")
        preview.src = e.target.result
        previewContainer.style.display = "block"
        uploadedSignatureData = e.target.result
      } else if (type === "validate") {
        // Desenhar no canvas de validação
        clearCanvas(validateCanvas, validateCtx)
        validateCtx.drawImage(img, 0, 0, validateCanvas.width, validateCanvas.height)

        // Comparar automaticamente
        if (referenceSignatureData) {
          compareSignatures()
        }
      }
    }

    img.src = e.target.result
  }

  reader.readAsDataURL(file)
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function clearCanvas(canvas, ctx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function clearMessages() {
  const messages = document.querySelectorAll(".message")
  messages.forEach((msg) => {
    msg.style.display = "none"
    msg.className = "message"
    msg.textContent = ""
  })
}

function showMessage(elementId, message, type) {
  const messageEl = document.getElementById(elementId)
  messageEl.textContent = message
  messageEl.className = `message ${type}`
  messageEl.style.display = "block"
}

// ============================================
// SALVAR ASSINATURA NO FIRESTORE
// ============================================
async function saveSignature() {
  const name = document.getElementById("save-name").value.trim()

  if (!name) {
    showMessage("save-message", "Por favor, digite um nome.", "error")
    return
  }

  if (!uploadedSignatureData) {
    showMessage("save-message", "Por favor, envie uma imagem da assinatura.", "error")
    return
  }

  try {
    await addDoc(collection(db, "signatures"), {
      name: name,
      signature: uploadedSignatureData,
      timestamp: new Date().toISOString(),
    })

    showMessage("save-message", "Assinatura salva com sucesso!", "success")

    document.getElementById("save-name").value = ""
    document.getElementById("preview-container").style.display = "none"
    uploadedSignatureData = null
    document.getElementById("signature-upload").value = ""
  } catch (error) {
    console.error("Erro ao salvar assinatura:", error)
    showMessage("save-message", "Erro ao salvar assinatura. Verifique a configuração do Firebase.", "error")
  }
}

// ============================================
// AUTOCOMPLETE
// ============================================
async function loadAllSignatures() {
  try {
    const querySnapshot = await getDocs(collection(db, "signatures"))
    allSignatures = []
    querySnapshot.forEach((doc) => {
      allSignatures.push({
        id: doc.id,
        name: doc.data().name,
        signature: doc.data().signature,
      })
    })
  } catch (error) {
    console.error("Erro ao carregar assinaturas:", error)
  }
}

async function handleAutocomplete(e) {
  const input = e.target.value.trim().toLowerCase()
  const autocompleteList = document.getElementById("autocomplete-list")

  if (!input) {
    autocompleteList.classList.remove("active")
    autocompleteList.innerHTML = ""
    return
  }

  if (allSignatures.length === 0) {
    await loadAllSignatures()
  }

  const filtered = allSignatures.filter((sig) => sig.name.toLowerCase().includes(input))

  if (filtered.length === 0) {
    autocompleteList.classList.remove("active")
    autocompleteList.innerHTML = ""
    return
  }

  autocompleteList.innerHTML = ""
  filtered.forEach((sig) => {
    const item = document.createElement("div")
    item.className = "autocomplete-item"

    const nameText = sig.name
    const startIndex = nameText.toLowerCase().indexOf(input)
    const beforeMatch = nameText.substring(0, startIndex)
    const match = nameText.substring(startIndex, startIndex + input.length)
    const afterMatch = nameText.substring(startIndex + input.length)

    item.innerHTML = `${beforeMatch}<strong>${match}</strong>${afterMatch}`

    item.addEventListener("click", () => {
      document.getElementById("validate-name").value = sig.name
      autocompleteList.classList.remove("active")
      loadSignatureForValidation(sig)
    })

    autocompleteList.appendChild(item)
  })

  autocompleteList.classList.add("active")
}

function loadSignatureForValidation(signatureData) {
  const img = new Image()
  img.crossOrigin = "anonymous"

  img.onload = () => {
    clearCanvas(referenceCanvas, referenceCtx)
    referenceCtx.drawImage(img, 0, 0, referenceCanvas.width, referenceCanvas.height)
    referenceSignatureData = signatureData.signature
  }

  img.src = signatureData.signature

  clearCanvas(validateCanvas, validateCtx)
  document.getElementById("validation-result").style.display = "none"
  document.getElementById("validation-area").classList.remove("hidden")

  showMessage("validate-message", "Assinatura carregada! Envie a nova assinatura para comparar.", "info")
}

// ============================================
// COMPARAÇÃO DE ASSINATURAS
// ============================================
function compareSignatures() {
  const referenceData = referenceCtx.getImageData(0, 0, referenceCanvas.width, referenceCanvas.height)
  const validateData = validateCtx.getImageData(0, 0, validateCanvas.width, validateCanvas.height)

  const similarity = calculateSimilarity(referenceData.data, validateData.data)
  const percentage = Math.round(similarity * 100)

  const resultDiv = document.getElementById("validation-result")
  const scoreDiv = document.getElementById("similarity-score")
  const messageDiv = document.getElementById("validation-message")

  scoreDiv.textContent = `${percentage}%`

  if (percentage >= 70) {
    scoreDiv.className = "similarity-score valid"
    messageDiv.textContent = "✓ Assinatura Válida"
    messageDiv.style.color = "#4ade80"
  } else {
    scoreDiv.className = "similarity-score invalid"
    messageDiv.textContent = "✗ Assinatura Inválida"
    messageDiv.style.color = "#f87171"
  }

  resultDiv.style.display = "block"
}

function calculateSimilarity(data1, data2) {
  if (data1.length !== data2.length) return 0

  let matchingPixels = 0
  let totalPixels = 0

  // Comparar apenas pixels não transparentes
  for (let i = 0; i < data1.length; i += 4) {
    const alpha1 = data1[i + 3]
    const alpha2 = data2[i + 3]

    // Se ambos os pixels têm alguma opacidade
    if (alpha1 > 0 || alpha2 > 0) {
      totalPixels++

      // Calcular diferença de cor
      const rDiff = Math.abs(data1[i] - data2[i])
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1])
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2])
      const aDiff = Math.abs(alpha1 - alpha2)

      const avgDiff = (rDiff + gDiff + bDiff + aDiff) / 4

      // Se a diferença for pequena (threshold de 30), considerar como match
      if (avgDiff < 30) {
        matchingPixels++
      }
    }
  }

  return totalPixels > 0 ? matchingPixels / totalPixels : 0
}
