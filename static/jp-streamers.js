// 전역 변수
let streamers = []
let filteredStreamers = []
let currentPage = 1
const rowsPerPage = 10
let searchTerm = ""
let editingStreamer = null

// 필터 상태
let filters = {
  platform: "",
  gender: "",
  communication: "",
}

// DOM 요소
const elements = {
  tableBody: document.getElementById("tableBody"),
  searchInput: document.getElementById("searchInput"),
  platformFilter: document.getElementById("platformFilter"),
  genderFilter: document.getElementById("genderFilter"),
  communicationFilter: document.getElementById("communicationFilter"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  addBtn: document.getElementById("addBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  pageInfo: document.getElementById("pageInfo"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  closeModal: document.getElementById("closeModal"),
  streamerForm: document.getElementById("streamerForm"),
  submitBtn: document.getElementById("submitBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  loading: document.getElementById("loading"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage"),
  toastClose: document.getElementById("toastClose"),
  deleteModal: document.getElementById("deleteModal"),
  closeDeleteModal: document.getElementById("closeDeleteModal"),
  cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
}

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners()
  loadStreamers()
})

// 이벤트 리스너 초기화
function initEventListeners() {
  // 기본 버튼
  elements.refreshBtn.addEventListener("click", loadStreamers)
  elements.addBtn.addEventListener("click", openAddModal)

  // 검색
  elements.searchInput.addEventListener("input", debounce(handleSearch, 300))

  // 필터
  elements.platformFilter.addEventListener("change", handleFilterChange)
  elements.genderFilter.addEventListener("change", handleFilterChange)
  elements.communicationFilter.addEventListener("change", handleFilterChange)
  elements.clearFiltersBtn.addEventListener("click", clearFilters)

  // 모달
  elements.closeModal.addEventListener("click", closeModal)
  elements.cancelBtn.addEventListener("click", closeModal)
  elements.streamerForm.addEventListener("submit", handleFormSubmit)

  // 페이지네이션
  elements.prevBtn.addEventListener("click", () => changePage(currentPage - 1))
  elements.nextBtn.addEventListener("click", () => changePage(currentPage + 1))

  // 토스트
  elements.toastClose.addEventListener("click", hideToast)

  // 모달 외부 클릭 시 닫기
  elements.modal.addEventListener("click", function (e) {
    if (e.target === this) closeModal()
  })

  // 삭제 모달
  elements.closeDeleteModal.addEventListener("click", closeDeleteModal)
  elements.cancelDeleteBtn.addEventListener("click", closeDeleteModal)
  elements.confirmDeleteBtn.addEventListener("click", executeDelete)
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

async function loadStreamers() {
  try {
    showLoading()

    const params = new URLSearchParams()
    if (searchTerm) {
      params.append("search", searchTerm)
    }
    if (filters.platform) params.append("platform", filters.platform)
    if (filters.gender) params.append("gender", filters.gender)
    if (filters.communication) params.append("communication_level", filters.communication)

    const data = await apiCall(`/api/jp-streamers?${params}`)
    streamers = data.data
    filteredStreamers = [...streamers]

    currentPage = 1
    renderTable()
    hideLoading()
  } catch (error) {
    console.error("데이터 로드 실패:", error)
    showToast("데이터 로드 실패: " + error.message, "error")
    hideLoading()
  }
}

async function createStreamer(data) {
  try {
    const result = await apiCall("/api/jp-streamers", {
      method: "POST",
      body: JSON.stringify(data),
    })

    streamers.push(result.data)
    handleSearch()
    showToast("스트리머가 성공적으로 추가되었습니다.")
    return result.data
  } catch (error) {
    showToast("스트리머 추가 실패: " + error.message, "error")
    throw error
  }
}

async function updateStreamer(streamerId, updates) {
  try {
    const result = await apiCall(`/api/jp-streamers/${streamerId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })

    const index = streamers.findIndex((s) => s.id === streamerId)
    if (index !== -1) {
      streamers[index] = result.data
    }

    handleSearch()
    showToast("스트리머 정보가 성공적으로 수정되었습니다.")
    return result.data
  } catch (error) {
    showToast("스트리머 수정 실패: " + error.message, "error")
    throw error
  }
}

async function deleteStreamer(streamerId) {
  try {
    await apiCall(`/api/jp-streamers/${streamerId}`, {
      method: "DELETE",
    })

    streamers = streamers.filter((s) => s.id !== streamerId)
    handleSearch()
    showToast("스트리머가 성공적으로 삭제되었습니다.")
  } catch (error) {
    showToast("스트리머 삭제 실패: " + error.message, "error")
    throw error
  }
}

// 유틸리티 함수
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 검색 및 필터링
function handleSearch() {
  searchTerm = elements.searchInput.value.trim().toLowerCase()
  applyFilters()
}

function handleFilterChange() {
  filters.platform = elements.platformFilter.value
  filters.gender = elements.genderFilter.value
  filters.communication = elements.communicationFilter.value
  applyFilters()
}

function clearFilters() {
  elements.platformFilter.value = ""
  elements.genderFilter.value = ""
  elements.communicationFilter.value = ""
  elements.searchInput.value = ""
  filters = { platform: "", gender: "", communication: "" }
  searchTerm = ""
  loadStreamers()
}

function applyFilters() {
  filteredStreamers = streamers.filter((streamer) => {
    // 검색 필터
    if (searchTerm) {
      const searchFields = [streamer.broadcast_name, streamer.korean_name, streamer.english_name].filter(Boolean)

      if (!searchFields.some((field) => field.toLowerCase().includes(searchTerm))) {
        return false
      }
    }

    // 플랫폼 필터
    if (filters.platform && streamer.platform !== filters.platform) {
      return false
    }

    // 성별 필터
    if (filters.gender && streamer.gender !== filters.gender) {
      return false
    }

    // 소통 단계 필터
    if (filters.communication && streamer.communication_level !== filters.communication) {
      return false
    }

    return true
  })

  currentPage = 1
  renderTable()
}

// 테이블 렌더링
function renderTable() {
  const totalPages = Math.ceil(filteredStreamers.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, filteredStreamers.length)
  const paginatedStreamers = filteredStreamers.slice(startIndex, endIndex)

  // 페이지 정보 업데이트
  elements.pageInfo.textContent = `${currentPage} / ${totalPages || 1}`
  elements.prevBtn.disabled = currentPage === 1
  elements.nextBtn.disabled = currentPage === totalPages || totalPages === 0

  // 테이블 내용 비우기
  elements.tableBody.innerHTML = ""

  // 데이터가 없는 경우
  if (paginatedStreamers.length === 0) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <h3>검색 결과가 없습니다</h3>
          <p>다른 검색어를 입력하거나 필터를 조정해보세요.</p>
        </td>
      </tr>
    `
    return
  }

  // 데이터 렌더링
  paginatedStreamers.forEach((streamer) => {
    const row = document.createElement("tr")

    row.innerHTML = `
      <td>
        <div style="font-weight: 500;">${escapeHtml(streamer.broadcast_name)}</div>
      </td>
      <td>${escapeHtml(streamer.korean_name || "-")}</td>
      <td>${escapeHtml(streamer.english_name || "-")}</td>
      <td>${escapeHtml(streamer.gender || "-")}</td>
      <td>${escapeHtml(streamer.platform || "-")}</td>
      <td>${streamer.avg_viewers || 0}</td>
      <td>${escapeHtml(streamer.communication_level || "-")}</td>
      <td>${streamer.post_count || 0}</td>
      <td>
        <div class="action-btns">
          <a href="/jp-streamer/${streamer.id}" class="btn btn-primary btn-sm">상세보기</a>
          <button class="action-btn delete-btn" data-id="${streamer.id}" title="삭제">🗑️</button>
        </div>
      </td>
    `

    elements.tableBody.appendChild(row)
  })

  // 삭제 버튼 이벤트 리스너 추가
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const streamerId = Number.parseInt(this.dataset.id)
      openDeleteModal(streamerId)
    })
  })
}

// 페이지네이션
function changePage(page) {
  const totalPages = Math.ceil(filteredStreamers.length / rowsPerPage)
  if (page < 1 || page > totalPages) return

  currentPage = page
  renderTable()
}

// 모달 관리
function openAddModal() {
  editingStreamer = null
  elements.modalTitle.textContent = "새 일본 스트리머 추가"
  elements.submitBtn.textContent = "💾 추가"

  // 폼 초기화
  elements.streamerForm.reset()

  elements.modal.style.display = "block"
}

function closeModal() {
  elements.modal.style.display = "none"
  editingStreamer = null
}

// 삭제 모달
function openDeleteModal(streamerId) {
  elements.confirmDeleteBtn.dataset.id = streamerId
  elements.deleteModal.style.display = "block"
}

function closeDeleteModal() {
  elements.deleteModal.style.display = "none"
}

async function executeDelete() {
  const streamerId = Number.parseInt(elements.confirmDeleteBtn.dataset.id)

  try {
    await deleteStreamer(streamerId)
    closeDeleteModal()
    loadStreamers()
  } catch (error) {
    console.error("스트리머 삭제 실패:", error)
  }
}

// 폼 처리
async function handleFormSubmit(e) {
  e.preventDefault()

  const formData = new FormData(elements.streamerForm)
  const data = {}

  // 폼 데이터 수집
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
    elements.submitBtn.disabled = true
    elements.submitBtn.textContent = "⏳ 처리 중..."

    if (editingStreamer) {
      await updateStreamer(editingStreamer.id, data)
    } else {
      await createStreamer(data)
    }

    closeModal()
  } catch (error) {
    console.error("폼 제출 실패:", error)
  } finally {
    elements.submitBtn.disabled = false
    elements.submitBtn.textContent = editingStreamer ? "💾 수정" : "💾 추가"
  }
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

function escapeHtml(text) {
  if (!text) return ""
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}
