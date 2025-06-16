let streamerId = null
let streamerData = null
let activeTab = "twitter"

// DOM 요소
const elements = {
  loading: document.getElementById("loading"),
  streamerDetail: document.getElementById("streamerDetail"),
  streamerName: document.getElementById("streamerName"),
  koreanName: document.getElementById("koreanName"),
  englishName: document.getElementById("englishName"),
  gender: document.getElementById("gender"),
  platform: document.getElementById("platform"),
  avgViewers: document.getElementById("avgViewers"),
  communicationLevel: document.getElementById("communicationLevel"),
  postCount: document.getElementById("postCount"),
  streamerLink: document.getElementById("streamerLink"),
  description: document.getElementById("description"),
  newDescription: document.getElementById("newDescription"),
  addDescriptionBtn: document.getElementById("addDescriptionBtn"),
  twitterTableBody: document.getElementById("twitterTableBody"),
  communicationTableBody: document.getElementById("communicationTableBody"),
  noTwitterData: document.getElementById("noTwitterData"),
  noCommunicationData: document.getElementById("noCommunicationData"),
  editBtn: document.getElementById("editBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  currentStreamerNav: document.getElementById("currentStreamerNav"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage"),
  toastClose: document.getElementById("toastClose"),
  editModal: document.getElementById("editModal"),
  closeEditModal: document.getElementById("closeEditModal"),
  editForm: document.getElementById("editForm"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  saveEditBtn: document.getElementById("saveEditBtn"),
  twitterModal: document.getElementById("twitterModal"),
  closeTwitterModal: document.getElementById("closeTwitterModal"),
  twitterForm: document.getElementById("twitterForm"),
  cancelTwitterBtn: document.getElementById("cancelTwitterBtn"),
  saveTwitterBtn: document.getElementById("saveTwitterBtn"),
  communicationModal: document.getElementById("communicationModal"),
  closeCommunicationModal: document.getElementById("closeCommunicationModal"),
  communicationForm: document.getElementById("communicationForm"),
  cancelCommunicationBtn: document.getElementById("cancelCommunicationBtn"),
  saveCommunicationBtn: document.getElementById("saveCommunicationBtn"),
  deleteModal: document.getElementById("deleteModal"),
  closeDeleteModal: document.getElementById("closeDeleteModal"),
  cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
  deleteItemModal: document.getElementById("deleteItemModal"),
  deleteItemTitle: document.getElementById("deleteItemTitle"),
  deleteItemMessage: document.getElementById("deleteItemMessage"),
  closeDeleteItemModal: document.getElementById("closeDeleteItemModal"),
  cancelDeleteItemBtn: document.getElementById("cancelDeleteItemBtn"),
  confirmDeleteItemBtn: document.getElementById("confirmDeleteItemBtn"),
  addTwitterBtn: document.getElementById("addTwitterBtn"),
  addCommunicationBtn: document.getElementById("addCommunicationBtn"),
}

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  // 스트리머 ID 가져오기
  const urlParts = window.location.pathname.split("/")
  streamerId = Number.parseInt(urlParts[urlParts.length - 1])

  if (isNaN(streamerId)) {
    showToast("유효하지 않은 스트리머 ID입니다.", "error")
    setTimeout(() => {
      window.location.href = "/jp-streamers"
    }, 2000)
    return
  }

  initEventListeners()
  loadStreamerData()
})

// 이벤트 리스너 초기화
function initEventListeners() {
  // 탭 전환
  document.querySelectorAll(".tab-button").forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabName = this.dataset.tab
      switchTab(tabName)
    })
  })

  // 설명 추가
  elements.addDescriptionBtn.addEventListener("click", addDescription)

  // 스트리머 수정
  elements.editBtn.addEventListener("click", openEditModal)

  // 스트리머 삭제
  elements.deleteBtn.addEventListener("click", openDeleteModal)

  // 트위터 관리 추가
  elements.addTwitterBtn.addEventListener("click", openTwitterModal)

  // 소통 내용 추가
  elements.addCommunicationBtn.addEventListener("click", openCommunicationModal)

  // 모달 닫기
  elements.closeEditModal.addEventListener("click", closeEditModal)
  elements.cancelEditBtn.addEventListener("click", closeEditModal)
  elements.closeTwitterModal.addEventListener("click", closeTwitterModal)
  elements.cancelTwitterBtn.addEventListener("click", closeTwitterModal)
  elements.closeCommunicationModal.addEventListener("click", closeCommunicationModal)
  elements.cancelCommunicationBtn.addEventListener("click", closeCommunicationModal)
  elements.closeDeleteModal.addEventListener("click", closeDeleteModal)
  elements.cancelDeleteBtn.addEventListener("click", closeDeleteModal)
  elements.closeDeleteItemModal.addEventListener("click", closeDeleteItemModal)
  elements.cancelDeleteItemBtn.addEventListener("click", closeDeleteItemModal)

  // 모달 외부 클릭 시 닫기
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        this.style.display = "none"
      }
    })
  })

  // 폼 제출
  elements.editForm.addEventListener("submit", handleEditFormSubmit)
  elements.twitterForm.addEventListener("submit", handleTwitterFormSubmit)
  elements.communicationForm.addEventListener("submit", handleCommunicationFormSubmit)

  // 삭제 확인
  elements.confirmDeleteBtn.addEventListener("click", deleteStreamer)
  elements.confirmDeleteItemBtn.addEventListener("click", deleteItem)

  // 토스트
  elements.toastClose.addEventListener("click", hideToast)
}

// API 호출
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || "요청 처리 중 오류가 발생했습니다.")
    }

    return data
  } catch (error) {
    console.error("API 호출 오류:", error)
    throw error
  }
}

// 스트리머 데이터 로드
async function loadStreamerData() {
  try {
    showLoading()

    const data = await apiCall(`/api/jp-streamers/${streamerId}`)
    streamerData = data.data

    renderStreamerData()
    hideLoading()
    elements.streamerDetail.style.display = "block"
  } catch (error) {
    console.error("스트리머 데이터 로드 실패:", error)
    showToast("스트리머 데이터 로드 실패: " + error.message, "error")
    hideLoading()
  }
}

// 스트리머 데이터 렌더링
function renderStreamerData() {
  const streamer = streamerData.streamer

  // 네비게이션 업데이트
  elements.currentStreamerNav.textContent = streamer.broadcast_name

  // 기본 정보
  elements.streamerName.textContent = streamer.broadcast_name
  elements.koreanName.textContent = streamer.korean_name || "-"
  elements.englishName.textContent = streamer.english_name || "-"
  elements.gender.textContent = streamer.gender || "-"
  elements.platform.textContent = streamer.platform || "-"
  elements.avgViewers.textContent = streamer.avg_viewers || "0"
  elements.communicationLevel.textContent = streamer.communication_level || "-"
  elements.postCount.textContent = streamer.post_count || "0"

  if (streamer.streamer_link) {
    elements.streamerLink.href = streamer.streamer_link
    elements.streamerLink.textContent = streamer.streamer_link
  } else {
    elements.streamerLink.textContent = "-"
    elements.streamerLink.removeAttribute("href")
  }

  // 설명
  elements.description.textContent = streamer.description || "설명이 없습니다."

  // 트위터 관리
  renderTwitterData()

  // 소통 내용
  renderCommunicationData()
}

// 트위터 관리 데이터 렌더링
function renderTwitterData() {
  const twitterData = streamerData.twitter_management

  if (!twitterData || twitterData.length === 0) {
    elements.noTwitterData.style.display = "block"
    elements.twitterTableBody.innerHTML = ""
    return
  }

  elements.noTwitterData.style.display = "none"
  elements.twitterTableBody.innerHTML = ""

  // 날짜 기준 내림차순 정렬
  twitterData.sort((a, b) => new Date(b.date) - new Date(a.date))

  twitterData.forEach((item) => {
    const row = document.createElement("tr")

    row.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.post_purpose)}</td>
      <td><a href="${escapeHtml(item.post_link)}" target="_blank" class="link">${shortenUrl(item.post_link)}</a></td>
      <td>${escapeHtml(item.effect || "-")}</td>
      <td>
        <div class="action-btns">
          <button class="action-btn delete-btn" data-id="${item.id}" data-type="twitter">🗑️</button>
        </div>
      </td>
    `

    elements.twitterTableBody.appendChild(row)
  })

  // 삭제 버튼 이벤트 리스너
  document.querySelectorAll("#twitterTableBody .delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = Number.parseInt(this.dataset.id)
      openDeleteItemModal("트위터 관리 항목", "이 트위터 관리 항목을 삭제하시겠습니까?", "twitter", id)
    })
  })
}

// 소통 내용 데이터 렌더링
function renderCommunicationData() {
  const communicationData = streamerData.communication

  if (!communicationData || communicationData.length === 0) {
    elements.noCommunicationData.style.display = "block"
    elements.communicationTableBody.innerHTML = ""
    return
  }

  elements.noCommunicationData.style.display = "none"
  elements.communicationTableBody.innerHTML = ""

  // 날짜 기준 내림차순 정렬
  communicationData.sort((a, b) => new Date(b.date) - new Date(a.date))

  communicationData.forEach((item) => {
    const row = document.createElement("tr")

    row.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.summary)}</td>
      <td>
        <div class="action-btns">
          <button class="action-btn delete-btn" data-id="${item.id}" data-type="communication">🗑️</button>
        </div>
      </td>
    `

    elements.communicationTableBody.appendChild(row)
  })

  // 삭제 버튼 이벤트 리스너
  document.querySelectorAll("#communicationTableBody .delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = Number.parseInt(this.dataset.id)
      openDeleteItemModal("소통 내용", "이 소통 내용을 삭제하시겠습니까?", "communication", id)
    })
  })
}

// 탭 전환
function switchTab(tabName) {
  activeTab = tabName

  // 모든 탭 비활성화
  document.querySelectorAll(".tab-button").forEach((tab) => {
    tab.classList.remove("active")
  })

  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active")
  })

  // 선택한 탭 활성화
  document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add("active")
  document.getElementById(`${tabName}Tab`).classList.add("active")
}

// 설명 추가
async function addDescription() {
  const newDescription = elements.newDescription.value.trim()

  if (!newDescription) {
    showToast("설명을 입력해주세요.", "warning")
    return
  }

  try {
    const currentDescription = streamerData.streamer.description || ""
    const updatedDescription = currentDescription ? `${currentDescription}\n\n${newDescription}` : newDescription

    await apiCall(`/api/jp-streamers/${streamerId}`, {
      method: "PUT",
      body: JSON.stringify({
        description: updatedDescription,
      }),
    })

    // 데이터 업데이트
    streamerData.streamer.description = updatedDescription
    elements.description.textContent = updatedDescription
    elements.newDescription.value = ""

    showToast("설명이 추가되었습니다.")
  } catch (error) {
    console.error("설명 추가 실패:", error)
    showToast("설명 추가 실패: " + error.message, "error")
  }
}

// 스트리머 수정 모달
function openEditModal() {
  const streamer = streamerData.streamer

  // 폼에 데이터 채우기
  document.getElementById("edit_broadcast_name").value = streamer.broadcast_name || ""
  document.getElementById("edit_korean_name").value = streamer.korean_name || ""
  document.getElementById("edit_english_name").value = streamer.english_name || ""
  document.getElementById("edit_gender").value = streamer.gender || ""
  document.getElementById("edit_platform").value = streamer.platform || ""
  document.getElementById("edit_avg_viewers").value = streamer.avg_viewers || ""
  document.getElementById("edit_communication_level").value = streamer.communication_level || ""
  document.getElementById("edit_streamer_link").value = streamer.streamer_link || ""

  elements.editModal.style.display = "block"
}

function closeEditModal() {
  elements.editModal.style.display = "none"
}

async function handleEditFormSubmit(e) {
  e.preventDefault()

  const formData = new FormData(elements.editForm)
  const data = {}

  for (const [key, value] of formData.entries()) {
    if (value.trim() !== "") {
      if (key === "avg_viewers") {
        data[key] = Number.parseInt(value)
      } else {
        data[key] = value.trim()
      }
    }
  }

  // 필수 필드 검증
  if (!data.broadcast_name) {
    showToast("방송이름은 필수 입력 항목입니다.", "error")
    return
  }

  try {
    elements.saveEditBtn.disabled = true
    elements.saveEditBtn.textContent = "⏳ 처리 중..."

    const result = await apiCall(`/api/jp-streamers/${streamerId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })

    // 데이터 업데이트
    streamerData.streamer = result.data
    renderStreamerData()

    closeEditModal()
    showToast("스트리머 정보가 수정되었습니다.")
  } catch (error) {
    console.error("스트리머 수정 실패:", error)
    showToast("스트리머 수정 실패: " + error.message, "error")
  } finally {
    elements.saveEditBtn.disabled = false
    elements.saveEditBtn.textContent = "💾 저장"
  }
}

// 트위터 관리 모달
function openTwitterModal() {
  // 폼 초기화
  elements.twitterForm.reset()

  // 오늘 날짜 설정
  document.getElementById("twitter_date").value = new Date().toISOString().split("T")[0]

  elements.twitterModal.style.display = "block"
}

function closeTwitterModal() {
  elements.twitterModal.style.display = "none"
}

async function handleTwitterFormSubmit(e) {
  e.preventDefault()

  const formData = new FormData(elements.twitterForm)
  const data = {
    streamer_id: streamerId,
  }

  for (const [key, value] of formData.entries()) {
    if (value.trim() !== "") {
      data[key] = value.trim()
    }
  }

  // 필수 필드 검증
  if (!data.date || !data.post_purpose || !data.post_link) {
    showToast("날짜, 포스팅 취지, 포스팅 링크는 필수 입력 항목입니다.", "error")
    return
  }

  try {
    elements.saveTwitterBtn.disabled = true
    elements.saveTwitterBtn.textContent = "⏳ 처리 중..."

    const result = await apiCall("/api/twitter-management", {
      method: "POST",
      body: JSON.stringify(data),
    })

    // 데이터 업데이트
    if (!streamerData.twitter_management) {
      streamerData.twitter_management = []
    }
    streamerData.twitter_management.push(result.data)
    streamerData.streamer.post_count = (streamerData.streamer.post_count || 0) + 1

    renderTwitterData()
    elements.postCount.textContent = streamerData.streamer.post_count

    closeTwitterModal()
    showToast("트위터 관리 항목이 추가되었습니다.")
  } catch (error) {
    console.error("트위터 관리 항목 추가 실패:", error)
    showToast("트위터 관리 항목 추가 실패: " + error.message, "error")
  } finally {
    elements.saveTwitterBtn.disabled = false
    elements.saveTwitterBtn.textContent = "💾 저장"
  }
}

// 소통 내용 모달
function openCommunicationModal() {
  // 폼 초기화
  elements.communicationForm.reset()

  // 오늘 날짜 설정
  document.getElementById("communication_date").value = new Date().toISOString().split("T")[0]

  elements.communicationModal.style.display = "block"
}

function closeCommunicationModal() {
  elements.communicationModal.style.display = "none"
}

async function handleCommunicationFormSubmit(e) {
  e.preventDefault()

  const formData = new FormData(elements.communicationForm)
  const data = {
    streamer_id: streamerId,
  }

  for (const [key, value] of formData.entries()) {
    if (value.trim() !== "") {
      data[key] = value.trim()
    }
  }

  // 필수 필드 검증
  if (!data.date || !data.summary) {
    showToast("날짜와 소통 내용 요약은 필수 입력 항목입니다.", "error")
    return
  }

  try {
    elements.saveCommunicationBtn.disabled = true
    elements.saveCommunicationBtn.textContent = "⏳ 처리 중..."

    const result = await apiCall("/api/communication", {
      method: "POST",
      body: JSON.stringify(data),
    })

    // 데이터 업데이트
    if (!streamerData.communication) {
      streamerData.communication = []
    }
    streamerData.communication.push(result.data)

    renderCommunicationData()

    closeCommunicationModal()
    showToast("소통 내용이 추가되었습니다.")
  } catch (error) {
    console.error("소통 내용 추가 실패:", error)
    showToast("소통 내용 추가 실패: " + error.message, "error")
  } finally {
    elements.saveCommunicationBtn.disabled = false
    elements.saveCommunicationBtn.textContent = "💾 저장"
  }
}

// 스트리머 삭제 모달
function openDeleteModal() {
  elements.deleteModal.style.display = "block"
}

function closeDeleteModal() {
  elements.deleteModal.style.display = "none"
}

async function deleteStreamer() {
  try {
    await apiCall(`/api/jp-streamers/${streamerId}`, {
      method: "DELETE",
    })

    showToast("스트리머가 삭제되었습니다.")

    // 목록 페이지로 이동
    setTimeout(() => {
      window.location.href = "/jp-streamers"
    }, 1500)
  } catch (error) {
    console.error("스트리머 삭제 실패:", error)
    showToast("스트리머 삭제 실패: " + error.message, "error")
    closeDeleteModal()
  }
}

// 항목 삭제 모달
function openDeleteItemModal(title, message, type, id) {
  elements.deleteItemTitle.textContent = title + " 삭제"
  elements.deleteItemMessage.textContent = message
  elements.confirmDeleteItemBtn.dataset.type = type
  elements.confirmDeleteItemBtn.dataset.id = id

  elements.deleteItemModal.style.display = "block"
}

function closeDeleteItemModal() {
  elements.deleteItemModal.style.display = "none"
}

async function deleteItem() {
  const type = elements.confirmDeleteItemBtn.dataset.type
  const id = Number.parseInt(elements.confirmDeleteItemBtn.dataset.id)

  try {
    if (type === "twitter") {
      await apiCall(`/api/twitter-management/${id}`, {
        method: "DELETE",
      })

      // 데이터 업데이트
      streamerData.twitter_management = streamerData.twitter_management.filter((item) => item.id !== id)
      streamerData.streamer.post_count = Math.max(0, (streamerData.streamer.post_count || 0) - 1)

      renderTwitterData()
      elements.postCount.textContent = streamerData.streamer.post_count

      showToast("트위터 관리 항목이 삭제되었습니다.")
    } else if (type === "communication") {
      await apiCall(`/api/communication/${id}`, {
        method: "DELETE",
      })

      // 데이터 업데이트
      streamerData.communication = streamerData.communication.filter((item) => item.id !== id)

      renderCommunicationData()

      showToast("소통 내용이 삭제되었습니다.")
    }

    closeDeleteItemModal()
  } catch (error) {
    console.error("항목 삭제 실패:", error)
    showToast("항목 삭제 실패: " + error.message, "error")
    closeDeleteItemModal()
  }
}

// 유틸리티 함수
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function shortenUrl(url) {
  if (!url) return ""

  try {
    const urlObj = new URL(url)
    return urlObj.hostname + (urlObj.pathname !== "/" ? urlObj.pathname : "")
  } catch (e) {
    return url
  }
}

function escapeHtml(text) {
  if (!text) return ""
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// UI 헬퍼 함수
function showLoading() {
  elements.loading.style.display = "flex"
}

function hideLoading() {
  elements.loading.style.display = "none"
}

function showToast(message, type = "success") {
  elements.toastMessage.textContent = message
  elements.toast.className = `toast ${type}`
  elements.toast.style.display = "flex"

  // 자동 제거
  setTimeout(() => {
    hideToast()
  }, 3000)
}

function hideToast() {
  elements.toast.style.display = "none"
}
