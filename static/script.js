let streamers = []
let filteredStreamers = []
let currentPage = 1
const rowsPerPage = 10
let searchTerm = ""
let searchField = "name"
const selectedStreamers = new Set()
let editingStreamer = null
let deleteType = "temp"
let currentDeleteStatus = "active"

// 필터 상태
let filters = {
  status: "",
  country: "",
  position: "",
}

// DOM 요소
const elements = {
  tableBody: document.getElementById("tableBody"),
  selectAll: document.getElementById("selectAll"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  countryFilter: document.getElementById("countryFilter"),
  positionFilter: document.getElementById("positionFilter"),
  deleteStatusFilter: document.getElementById("deleteStatusFilter"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  addBtn: document.getElementById("addBtn"),
  bulkActions: document.getElementById("bulkActions"),
  selectedCount: document.getElementById("selectedCount"),
  bulkTempDeleteBtn: document.getElementById("bulkTempDeleteBtn"),
  bulkPermanentDeleteBtn: document.getElementById("bulkPermanentDeleteBtn"),
  bulkRestoreBtn: document.getElementById("bulkRestoreBtn"),
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
  restoreModal: document.getElementById("restoreModal"),
  closeRestoreModal: document.getElementById("closeRestoreModal"),
  deletedStreamerInfo: document.getElementById("deletedStreamerInfo"),
  cancelRestoreBtn: document.getElementById("cancelRestoreBtn"),
  confirmRestoreBtn: document.getElementById("confirmRestoreBtn"),
  newStreamerBtn: document.getElementById("newStreamerBtn"),
  deleteModal: document.getElementById("deleteModal"),
  deleteModalTitle: document.getElementById("deleteModalTitle"),
  deleteModalMessage: document.getElementById("deleteModalMessage"),
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

  // 검색 탭
  document.querySelectorAll(".tab-btn").forEach((tab) => {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"))
      this.classList.add("active")
      searchField = this.dataset.field
      handleSearch()
    })
  })

  // 필터
  elements.statusFilter.addEventListener("change", handleFilterChange)
  elements.countryFilter.addEventListener("change", handleFilterChange)
  elements.positionFilter.addEventListener("change", handleFilterChange)
  elements.deleteStatusFilter.addEventListener("change", handleDeleteStatusChange)
  elements.clearFiltersBtn.addEventListener("click", clearFilters)

  // 모달
  elements.closeModal.addEventListener("click", closeModal)
  elements.cancelBtn.addEventListener("click", closeModal)
  elements.streamerForm.addEventListener("submit", handleFormSubmit)

  // 대량 작업
  elements.selectAll.addEventListener("change", toggleAllSelection)
  elements.bulkTempDeleteBtn.addEventListener("click", () => handleBulkDelete("temp"))
  elements.bulkPermanentDeleteBtn.addEventListener("click", () => handleBulkDelete("permanent"))
  elements.bulkRestoreBtn.addEventListener("click", handleBulkRestore)

  // 페이지네이션
  elements.prevBtn.addEventListener("click", () => changePage(currentPage - 1))
  elements.nextBtn.addEventListener("click", () => changePage(currentPage + 1))

  // 토스트
  elements.toastClose.addEventListener("click", hideToast)

  // 모달 외부 클릭 시 닫기
  elements.modal.addEventListener("click", function (e) {
    if (e.target === this) closeModal()
  })

  // 복구 모달
  elements.closeRestoreModal.addEventListener("click", closeRestoreModal)
  elements.cancelRestoreBtn.addEventListener("click", closeRestoreModal)
  elements.confirmRestoreBtn.addEventListener("click", handleRestoreStreamer)
  elements.newStreamerBtn.addEventListener("click", handleAddNewStreamer)

  // 삭제 모달
  elements.closeDeleteModal.addEventListener("click", closeDeleteModal)
  elements.cancelDeleteBtn.addEventListener("click", closeDeleteModal)
  elements.confirmDeleteBtn.addEventListener("click", executeDelete)

  // 국가 선택 시 한국어 이름 자동 설정
  document.getElementById("country_iso").addEventListener("change", function () {
    const countryMap = {
      KR: "대한민국",
      US: "미국",
      CN: "중국",
      JP: "일본",
      TW: "대만",
    }
    document.getElementById("country_kr").value = countryMap[this.value] || ""
  })
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
      params.append("search_field", searchField)
    }
    if (filters.status) params.append("status", filters.status)
    if (filters.country) params.append("country", filters.country)
    if (filters.position) params.append("position", filters.position)
    params.append("delete_status", currentDeleteStatus)

    const data = await apiCall(`/api/streamers?${params}`)
    streamers = data.data
    filteredStreamers = [...streamers]

    currentPage = 1
    renderTable()
    updateBulkActionButtons()
    hideLoading()
  } catch (error) {
    console.error("데이터 로드 실패:", error)
    showToast("데이터 로드 실패: " + error.message, "error")
    hideLoading()
  }
}

async function createStreamer(data) {
  try {
    const result = await apiCall("/api/streamers", {
      method: "POST",
      body: JSON.stringify(data),
    })

    // 삭제된 스트리머 경고 처리
    if (!result.success && result.warning) {
      showRestoreModal(result.deleted_streamer)
      return null
    }

    streamers.push(result.data)
    handleSearch()
    showToast("스트리머가 성공적으로 추가되었습니다.")
    return result.data
  } catch (error) {
    showToast("스트리머 추가 실패: " + error.message, "error")
    throw error
  }
}

async function updateStreamer(originalStreamer, updates) {
  try {
    const result = await apiCall("/api/streamers", {
      method: "PUT",
      body: JSON.stringify({
        original: {
          name: originalStreamer.name,
          riot_id_name: originalStreamer.riot_id_name,
          riot_id_tag_line: originalStreamer.riot_id_tag_line,
        },
        updates: updates,
      }),
    })

    const index = streamers.findIndex((s) => s.id === originalStreamer.id)
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

async function deleteStreamer(streamer, deleteType = "temp") {
  try {
    await apiCall(`/api/streamers?delete_type=${deleteType}`, {
      method: "DELETE",
      body: JSON.stringify({
        name: streamer.name,
        riot_id_name: streamer.riot_id_name,
        riot_id_tag_line: streamer.riot_id_tag_line,
      }),
    })

    if (deleteType === "permanent") {
      streamers = streamers.filter((s) => s.id !== streamer.id)
    } else {
      // 임시 삭제의 경우 상태만 변경
      const index = streamers.findIndex((s) => s.id === streamer.id)
      if (index !== -1) {
        streamers[index].delete_status = "temp_deleted"
      }
    }

    selectedStreamers.delete(getStreamerKey(streamer))

    handleSearch()
    showToast(`스트리머가 성공적으로 ${deleteType === "permanent" ? "영구" : "임시"} 삭제되었습니다.`)
  } catch (error) {
    showToast("스트리머 삭제 실패: " + error.message, "error")
    throw error
  }
}

async function bulkDeleteStreamers(streamerList, deleteType = "temp") {
  try {
    const identifiers = streamerList.map((s) => ({
      name: s.name,
      riot_id_name: s.riot_id_name,
      riot_id_tag_line: s.riot_id_tag_line,
    }))

    const result = await apiCall("/api/streamers/bulk-delete", {
      method: "POST",
      body: JSON.stringify({
        streamers: identifiers,
        delete_type: deleteType,
      }),
    })

    if (deleteType === "permanent") {
      const deletedIds = streamerList.map((s) => s.id)
      streamers = streamers.filter((s) => !deletedIds.includes(s.id))
    } else {
      // 임시 삭제의 경우 상태만 변경
      streamerList.forEach((streamer) => {
        const index = streamers.findIndex((s) => s.id === streamer.id)
        if (index !== -1) {
          streamers[index].delete_status = "temp_deleted"
        }
      })
    }

    selectedStreamers.clear()

    handleSearch()
    showToast(result.message)
  } catch (error) {
    showToast("대량 삭제 실패: " + error.message, "error")
    throw error
  }
}

async function restoreStreamer(streamer) {
  try {
    const result = await apiCall("/api/streamers/restore", {
      method: "POST",
      body: JSON.stringify({
        name: streamer.name,
        riot_id_name: streamer.riot_id_name,
        riot_id_tag_line: streamer.riot_id_tag_line,
      }),
    })

    // 상태 업데이트
    const index = streamers.findIndex((s) => s.id === streamer.id)
    if (index !== -1) {
      streamers[index].delete_status = "active"
    }

    handleSearch()
    showToast("스트리머가 성공적으로 복구되었습니다.")
    return result.data
  } catch (error) {
    showToast("스트리머 복구 실패: " + error.message, "error")
    throw error
  }
}

// 유틸리티 함수
function getStreamerKey(streamer) {
  return `${streamer.name}-${streamer.riot_id_name || ""}-${streamer.riot_id_tag_line || ""}`
}

function findStreamerByKey(key) {
  return streamers.find((s) => getStreamerKey(s) === key)
}

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
  filters.status = elements.statusFilter.value
  filters.country = elements.countryFilter.value
  filters.position = elements.positionFilter.value
  applyFilters()
}

function handleDeleteStatusChange() {
  currentDeleteStatus = elements.deleteStatusFilter.value
  loadStreamers()
}

function clearFilters() {
  elements.statusFilter.value = ""
  elements.countryFilter.value = ""
  elements.positionFilter.value = ""
  elements.deleteStatusFilter.value = "active"
  filters = { status: "", country: "", position: "" }
  currentDeleteStatus = "active"
  elements.searchInput.value = ""
  searchTerm = ""
  loadStreamers()
}

function applyFilters() {
  filteredStreamers = streamers.filter((streamer) => {
    // 검색 필터
    if (searchTerm) {
      const field = searchField === "name" ? streamer.name : streamer.riot_id_name
      if (!field || !field.toLowerCase().includes(searchTerm)) {
        return false
      }
    }

    // 상태 필터
    if (filters.status && streamer.status !== filters.status) {
      return false
    }

    // 국가 필터
    if (filters.country && streamer.country_iso !== filters.country) {
      return false
    }

    // 포지션 필터
    if (filters.position && streamer.position !== filters.position) {
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
        <td colspan="10" class="empty-state">
          <h3>검색 결과가 없습니다</h3>
          <p>다른 검색어를 입력하거나 필터를 조정해보세요.</p>
        </td>
      </tr>
    `
    updateSelectAllCheckbox()
    updateBulkActions()
    return
  }

  // 데이터 렌더링
  paginatedStreamers.forEach((streamer) => {
    const row = document.createElement("tr")
    const streamerKey = getStreamerKey(streamer)
    const isSelected = selectedStreamers.has(streamerKey)
    const isDeleted = streamer.delete_status === "temp_deleted"

    if (isSelected) {
      row.classList.add("selected")
    }

    if (isDeleted) {
      row.classList.add("deleted")
    }

    row.innerHTML = `
      <td>
        <input type="checkbox" class="streamer-checkbox" data-key="${streamerKey}" ${isSelected ? "checked" : ""}>
      </td>
      <td>${getStatusBadge(streamer.status)}</td>
      <td>
        <div>
          <div style="font-weight: 500;">${escapeHtml(streamer.name)}</div>
          ${
            streamer.championship_name && streamer.championship_name !== streamer.name
              ? `<div style="font-size: 12px; color: #6b7280;">대회명: ${escapeHtml(streamer.championship_name)}</div>`
              : ""
          }
          ${isDeleted ? `<div style="font-size: 12px; color: #ef4444; font-weight: 500;">임시 삭제됨</div>` : ""}
        </div>
      </td>
      <td>${escapeHtml(streamer.riot_id_name || "-")}</td>
      <td>${escapeHtml(streamer.riot_id_tag_line || "-")}</td>
      <td>
        ${escapeHtml(streamer.country_kr || "-")}
        ${streamer.country_iso ? `<span style="font-size: 12px; color: #6b7280;">(${streamer.country_iso})</span>` : ""}
      </td>
      <td>${streamer.position ? `<span class="badge badge-team">${escapeHtml(streamer.position)}</span>` : "-"}</td>
      <td>${streamer.pro_team ? `<span class="badge badge-team">${escapeHtml(streamer.pro_team)}</span>` : "-"}</td>
      <td>
        <div class="social-links">
          ${renderSocialLink(streamer.twitch, "T", "Twitch")}
          ${renderSocialLink(streamer.youtube, "Y", "YouTube")}
          ${renderSocialLink(streamer.afreecatv, "A", "AfreecaTV")}
          ${renderSocialLink(streamer.naver_cafe, "N", "네이버 카페")}
          ${renderSocialLink(streamer.kick, "K", "KICK")}
          ${renderSocialLink(streamer.tiktok, "TT", "틱톡")}
        </div>
      </td>
      <td>
        <div class="action-btns">
          ${
            isDeleted
              ? `<button class="action-btn edit-btn" data-key="${streamerKey}" title="복구">♻️</button>`
              : `<button class="action-btn edit-btn" data-key="${streamerKey}" title="수정">✏️</button>`
          }
          <button class="action-btn delete-btn" data-key="${streamerKey}" title="삭제">🗑️</button>
        </div>
      </td>
    `

    elements.tableBody.appendChild(row)
  })

  // 이벤트 리스너 추가
  addTableEventListeners()
  updateSelectAllCheckbox()
  updateBulkActions()
}

function addTableEventListeners() {
  // 수정/복구 버튼
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const key = this.dataset.key
      const streamer = findStreamerByKey(key)
      if (streamer) {
        if (streamer.delete_status === "temp_deleted") {
          // 복구 처리
          handleRestoreConfirmation(streamer)
        } else {
          // 수정 처리
          openEditModal(streamer)
        }
      }
    })
  })

  // 삭제 버튼
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const key = this.dataset.key
      const streamer = findStreamerByKey(key)
      if (streamer) {
        openDeleteModal(streamer)
      }
    })
  })

  // 체크박스
  document.querySelectorAll(".streamer-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const key = this.dataset.key
      if (this.checked) {
        selectedStreamers.add(key)
      } else {
        selectedStreamers.delete(key)
      }
      updateBulkActions()
      updateBulkActionButtons()
      updateSelectAllCheckbox()
    })
  })
}

// 렌더링 헬퍼 함수
function getStatusBadge(status) {
  if (!status) return '<span class="badge">-</span>'

  const statusLower = status.toLowerCase()
  if (statusLower === "pro") {
    return '<span class="badge badge-pro">PRO</span>'
  } else if (statusLower === "streamer") {
    return '<span class="badge badge-streamer">STREAMER</span>'
  }
  return `<span class="badge">${escapeHtml(status.toUpperCase())}</span>`
}

function renderSocialLink(url, text, platform) {
  if (!url) return ""
  return `<a href="${escapeHtml(url)}" target="_blank" class="social-link" title="${platform}">${text}</a>`
}

function escapeHtml(text) {
  if (!text) return ""
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// 선택 관리
function toggleAllSelection() {
  const checkboxes = document.querySelectorAll(".streamer-checkbox")
  const isChecked = elements.selectAll.checked

  checkboxes.forEach((checkbox) => {
    checkbox.checked = isChecked
    const key = checkbox.dataset.key

    if (isChecked) {
      selectedStreamers.add(key)
    } else {
      selectedStreamers.delete(key)
    }
  })

  updateBulkActions()
  updateBulkActionButtons()
}

function updateSelectAllCheckbox() {
  const checkboxes = document.querySelectorAll(".streamer-checkbox")
  const checkedCount = document.querySelectorAll(".streamer-checkbox:checked").length

  if (checkboxes.length === 0) {
    elements.selectAll.checked = false
    elements.selectAll.indeterminate = false
  } else if (checkedCount === 0) {
    elements.selectAll.checked = false
    elements.selectAll.indeterminate = false
  } else if (checkedCount === checkboxes.length) {
    elements.selectAll.checked = true
    elements.selectAll.indeterminate = false
  } else {
    elements.selectAll.checked = false
    elements.selectAll.indeterminate = true
  }
}

function updateBulkActions() {
  const count = selectedStreamers.size

  if (count > 0) {
    elements.bulkActions.style.display = "flex"
    elements.selectedCount.textContent = `${count}명이 선택되었습니다`
  } else {
    elements.bulkActions.style.display = "none"
  }
}

function updateBulkActionButtons() {
  // 선택된 스트리머 중 임시 삭제된 스트리머가 있는지 확인
  const selectedStreamersList = getSelectedStreamers()
  const hasDeletedStreamers = selectedStreamersList.some((s) => s.delete_status === "temp_deleted")
  const hasActiveStreamers = selectedStreamersList.some((s) => s.delete_status === "active")

  // 임시 삭제된 스트리머가 있으면 복구 버튼 표시
  elements.bulkRestoreBtn.style.display = hasDeletedStreamers ? "block" : "none"

  // 활성 스트리머가 있으면 삭제 버튼들 표시
  elements.bulkTempDeleteBtn.style.display = hasActiveStreamers ? "block" : "none"
  elements.bulkPermanentDeleteBtn.style.display = hasActiveStreamers ? "block" : "none"
}

function getSelectedStreamers() {
  return Array.from(selectedStreamers)
    .map((key) => findStreamerByKey(key))
    .filter(Boolean)
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
  elements.modalTitle.textContent = "새 스트리머 추가"
  elements.submitBtn.textContent = "💾 추가"

  // 폼 초기화
  elements.streamerForm.reset()
  document.getElementById("status").value = "Streamer"
  document.getElementById("activate").value = "1"

  elements.modal.style.display = "block"
}

function openEditModal(streamer) {
  editingStreamer = streamer
  elements.modalTitle.textContent = "스트리머 정보 수정"
  elements.submitBtn.textContent = "💾 수정"

  // 폼에 데이터 채우기
  const formFields = [
    "status",
    "name",
    "championship_name",
    "riot_id_name",
    "riot_id_tag_line",
    "country_iso",
    "country_kr",
    "position",
    "pro_team",
    "twitch",
    "youtube",
    "afreecatv",
    "naver_cafe",
    "kick",
    "tiktok",
    "activate",
  ]

  formFields.forEach((field) => {
    const element = document.getElementById(field)
    if (element && streamer[field] !== undefined) {
      element.value = streamer[field]
    }
  })

  elements.modal.style.display = "block"
}

function closeModal() {
  elements.modal.style.display = "none"
  editingStreamer = null
}

// 복구 모달
function showRestoreModal(deletedStreamer) {
  elements.deletedStreamerInfo.innerHTML = `
    <p><strong>이름:</strong> ${escapeHtml(deletedStreamer.name)}</p>
    <p><strong>라이엇 ID:</strong> ${escapeHtml(deletedStreamer.riot_id_name || "-")}</p>
    <p><strong>태그라인:</strong> ${escapeHtml(deletedStreamer.riot_id_tag_line || "-")}</p>
    <p><strong>상태:</strong> ${getStatusBadge(deletedStreamer.status)}</p>
  `

  // 복구 버튼에 데이터 설정
  elements.confirmRestoreBtn.dataset.id = deletedStreamer.id
  elements.confirmRestoreBtn.dataset.name = deletedStreamer.name
  elements.confirmRestoreBtn.dataset.riotIdName = deletedStreamer.riot_id_name || ""
  elements.confirmRestoreBtn.dataset.riotIdTagLine = deletedStreamer.riot_id_tag_line || ""

  elements.restoreModal.style.display = "block"
}

function closeRestoreModal() {
  elements.restoreModal.style.display = "none"
}

async function handleRestoreStreamer() {
  const btn = elements.confirmRestoreBtn
  const streamer = {
    id: Number.parseInt(btn.dataset.id),
    name: btn.dataset.name,
    riot_id_name: btn.dataset.riotIdName,
    riot_id_tag_line: btn.dataset.riotIdTagLine,
  }

  try {
    await restoreStreamer(streamer)
    closeRestoreModal()
    loadStreamers()
  } catch (error) {
    console.error("스트리머 복구 실패:", error)
  }
}

function handleAddNewStreamer() {
  closeRestoreModal()
  // 폼 제출 계속 진행
  const formData = new FormData(elements.streamerForm)
  const data = {}

  for (const [key, value] of formData.entries()) {
    if (value.trim() !== "") {
      if (key === "activate") {
        data[key] = Number.parseInt(value)
      } else {
        data[key] = value.trim()
      }
    }
  }

  createStreamer(data)
    .then((newStreamer) => {
      if (newStreamer) {
        closeModal()
      }
    })
    .catch((error) => {
      console.error("폼 제출 실패:", error)
    })
}

// 삭제 모달
function openDeleteModal(streamer) {
  const isDeleted = streamer.delete_status === "temp_deleted"

  if (isDeleted) {
    elements.deleteModalTitle.textContent = "스트리머 영구 삭제"
    elements.deleteModalMessage.textContent = `정말로 ${streamer.name} 스트리머를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`

    // 라디오 버튼 숨기기
    document.querySelector(".delete-options").style.display = "none"

    // 삭제 타입 설정
    deleteType = "permanent"
  } else {
    elements.deleteModalTitle.textContent = "스트리머 삭제"
    elements.deleteModalMessage.textContent = `정말로 ${streamer.name} 스트리머를 삭제하시겠습니까?`

    // 라디오 버튼 표시
    document.querySelector(".delete-options").style.display = "block"

    // 기본 삭제 타입 설정
    document.querySelector('input[name="deleteType"][value="temp"]').checked = true
    deleteType = "temp"
  }

  // 라디오 버튼 이벤트 리스너
  document.querySelectorAll('input[name="deleteType"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      deleteType = this.value
    })
  })

  // 삭제할 스트리머 정보 저장
  elements.confirmDeleteBtn.dataset.id = streamer.id
  elements.confirmDeleteBtn.dataset.name = streamer.name
  elements.confirmDeleteBtn.dataset.riotIdName = streamer.riot_id_name || ""
  elements.confirmDeleteBtn.dataset.riotIdTagLine = streamer.riot_id_tag_line || ""

  elements.deleteModal.style.display = "block"
}

function closeDeleteModal() {
  elements.deleteModal.style.display = "none"
}

async function executeDelete() {
  const btn = elements.confirmDeleteBtn
  const streamer = {
    id: Number.parseInt(btn.dataset.id),
    name: btn.dataset.name,
    riot_id_name: btn.dataset.riotIdName,
    riot_id_tag_line: btn.dataset.riotIdTagLine,
  }

  try {
    await deleteStreamer(streamer, deleteType)
    closeDeleteModal()
    loadStreamers()
  } catch (error) {
    console.error("스트리머 삭제 실패:", error)
  }
}

function handleRestoreConfirmation(streamer) {
  if (confirm(`${streamer.name} 스트리머를 복구하시겠습니까?`)) {
    restoreStreamer(streamer)
      .then(() => {
        loadStreamers()
      })
      .catch((error) => {
        console.error("스트리머 복구 실패:", error)
      })
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
      if (key === "activate") {
        data[key] = Number.parseInt(value)
      } else {
        data[key] = value.trim()
      }
    }
  }

  // 필수 필드 검증
  if (!data.name) {
    showToast("이름은 필수 입력 항목입니다.", "error")
    return
  }

  try {
    elements.submitBtn.disabled = true
    elements.submitBtn.textContent = "⏳ 처리 중..."

    if (editingStreamer) {
      await updateStreamer(editingStreamer, data)
      closeModal()
    } else {
      const newStreamer = await createStreamer(data)
      if (newStreamer) {
        closeModal()
      }
    }
  } catch (error) {
    console.error("폼 제출 실패:", error)
  } finally {
    elements.submitBtn.disabled = false
    elements.submitBtn.textContent = editingStreamer ? "💾 수정" : "💾 추가"
  }
}

// 대량 작업 처리
async function handleBulkDelete(type) {
  const selectedStreamersList = getSelectedStreamers()
  if (selectedStreamersList.length === 0) return

  // 임시 삭제된 스트리머 필터링
  const streamersToDelete = selectedStreamersList.filter((s) => s.delete_status === "active")

  if (streamersToDelete.length === 0) {
    showToast("선택된 활성 스트리머가 없습니다.", "warning")
    return
  }

  const confirmMessage = `선택된 ${streamersToDelete.length}명의 스트리머를 ${type === "permanent" ? "영구" : "임시"} 삭제하시겠습니까?`

  if (!confirm(confirmMessage)) return

  try {
    await bulkDeleteStreamers(streamersToDelete, type)
  } catch (error) {
    console.error("대량 삭제 실패:", error)
  }
}

async function handleBulkRestore() {
  const selectedStreamersList = getSelectedStreamers()
  if (selectedStreamersList.length === 0) return

  // 임시 삭제된 스트리머만 필터링
  const streamersToRestore = selectedStreamersList.filter((s) => s.delete_status === "temp_deleted")

  if (streamersToRestore.length === 0) {
    showToast("선택된 임시 삭제 스트리머가 없습니다.", "warning")
    return
  }

  const confirmMessage = `선택된 ${streamersToRestore.length}명의 스트리머를 복구하시겠습니까?`

  if (!confirm(confirmMessage)) return

  try {
    let restoredCount = 0

    for (const streamer of streamersToRestore) {
      await restoreStreamer(streamer)
      restoredCount++
    }

    showToast(`${restoredCount}명의 스트리머가 성공적으로 복구되었습니다.`)
    loadStreamers()
  } catch (error) {
    console.error("대량 복구 실패:", error)
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
