document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded.');

  let allRetenciones:any = [];
  let filteredRetenciones = [];
  let currentSortColumn:any = null;
  let currentSortDirection = 'desc'; // Default to descending for most recent first
  let currentPage = 1;
  let itemsPerPage = 15; // Initial value, will be adjusted dynamically
  let totalRecords = 0; // Declare totalRecords here

  const dashboardCard = document.getElementById('dashboard-card');
  const searchFilterControls = document.getElementById('search-filter-controls');
  const tableScrollContainer = document.getElementById('table-scroll-container');
  const tableHeader = document.getElementById('table-header');
  const paginationControls = document.getElementById('pagination-controls');

  const tableBody = document.getElementById('retenciones-table-body');
  const searchInput = document.getElementById('search-input');
  const filterAllBtn = document.getElementById('filter-all');
  const filterIslrBtn = document.getElementById('filter-islr');
  const filterIvaBtn = document.getElementById('filter-iva');
  const tableHeaders = document.querySelectorAll('#table-header th[data-sort]');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfoSpan = document.getElementById('page-info');

  // Function to fetch data from the server
  async function fetchData() {
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('limit', itemsPerPage.toString());
    params.append('sortColumn', currentSortColumn || 'fecha_documento');
    params.append('sortDirection', currentSortDirection);
    if (searchInput && (searchInput as HTMLInputElement).value) {
      params.append('searchTerm', (searchInput as HTMLInputElement).value);
    }
    if (filterIslrBtn?.classList.contains('bg-blue-600')) {
      params.append('typeFilter', 'ISLR');
    } else if (filterIvaBtn?.classList.contains('bg-blue-600')) {
      params.append('typeFilter', 'IVA');
    }

    try {
      const response = await fetch(`/api/retenciones?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        allRetenciones = result.data; // Data for the current page
        totalRecords = result.total; // Update totalRecords
        console.log('Fetched data:', allRetenciones.length, 'items. Total records:', totalRecords);
        renderTable(); // Call renderTable without passing totalRecords as it's now global
      } else {
        console.error('Failed to fetch retenciones:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching retenciones:', error);
    }
  }

  function adjustTableLayout() {
    if (!dashboardCard || !searchFilterControls || !tableScrollContainer || !tableHeader || !paginationControls) {
      console.warn('One or more required elements for table layout adjustment not found.');
      return;
    }

    // Get computed styles for accurate measurements
    const dashboardCardStyle = window.getComputedStyle(dashboardCard);
    const cardPaddingY = parseFloat(dashboardCardStyle.paddingTop) + parseFloat(dashboardCardStyle.paddingBottom);
    const cardMarginBottom = parseFloat(dashboardCardStyle.marginBottom);

    const searchFilterHeight = searchFilterControls.offsetHeight;
    const tableHeaderHeight = tableHeader.offsetHeight;
    const paginationHeight = paginationControls.offsetHeight;

    // Calculate available height for the entire dashboard card content area
    const mainContentArea = document.querySelector('main.flex-1.overflow-x-hidden.overflow-y-auto.bg-gray-100.p-6');
    if (!mainContentArea) {
      console.error('Main content area not found.');
      return;
    }
    const mainPaddingY = parseFloat(window.getComputedStyle(mainContentArea).paddingTop) + parseFloat(window.getComputedStyle(mainContentArea).paddingBottom);
    const mainAvailableHeight = mainContentArea.clientHeight - mainPaddingY;

    // Calculate available height for the table body within the dashboard card
    const availableHeightForTableBody = mainAvailableHeight - searchFilterHeight - tableHeaderHeight - paginationHeight - cardPaddingY - cardMarginBottom - 20; // 20px for extra buffer

    // Estimate row height dynamically by creating a dummy row
    let estimatedRowHeight = 0;
    if (tableBody && tableBody.children.length > 0) {
      estimatedRowHeight = tableBody.offsetHeight;
    } else {
      // If no rows, create a dummy row to measure
      const dummyRow = document.createElement('tr');
      dummyRow.innerHTML = `<td class="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Dummy</td>`;
      dummyRow.style.visibility = 'hidden'; // Hide it
      tableBody?.appendChild(dummyRow);
      estimatedRowHeight = dummyRow.offsetHeight;
      tableBody?.removeChild(dummyRow);
    }

    if (estimatedRowHeight === 0) {
      estimatedRowHeight = 36; // Fallback if dynamic measurement fails
    }

    // Calculate dynamic itemsPerPage
    const newItemsPerPage = Math.max(1, Math.floor(availableHeightForTableBody / estimatedRowHeight));
    if (newItemsPerPage !== itemsPerPage) {
      itemsPerPage = newItemsPerPage;
      currentPage = 1; // Reset page when itemsPerPage changes
      console.log('Adjusted itemsPerPage to:', itemsPerPage);
    }

    // Set max-height for the scrollable table container
    tableScrollContainer.style.maxHeight = `${availableHeightForTableBody}px`;
    tableScrollContainer.style.overflowY = 'auto';

    console.log('--- adjustTableLayout Debug ---');
    console.log('Window Height:', window.innerHeight);
    console.log('Main Content Area Client Height:', mainContentArea.clientHeight);
    console.log('Main Padding Y:', mainPaddingY);
    console.log('Main Available Height:', mainAvailableHeight);
    console.log('Dashboard Card Padding Y:', cardPaddingY);
    console.log('Search Filter Height:', searchFilterHeight);
    console.log('Table Header Height:', tableHeader.offsetHeight);
    console.log('Pagination Height:', paginationControls.offsetHeight);
    console.log('Card Margin Bottom:', cardMarginBottom);
    console.log('Available Height for Table Body:', availableHeightForTableBody);
    console.log('Estimated Row Height:', estimatedRowHeight);
    console.log('Calculated itemsPerPage:', itemsPerPage);
    console.log('-------------------------------');

    fetchData(); // Fetch data with new itemsPerPage
  }

  function renderTable() {
    if(tableBody) tableBody.innerHTML = '';
    console.log('Rendering table with', allRetenciones.length, 'items on page.');
    console.log('totalRecords in renderTable:', totalRecords);
    console.log('itemsPerPage in renderTable:', itemsPerPage);

    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    if(pageInfoSpan) pageInfoSpan.textContent = `Página ${currentPage} de ${totalPages}`;

    if(prevPageBtn) (prevPageBtn as HTMLButtonElement).disabled = currentPage === 1;
    if(nextPageBtn) (nextPageBtn as HTMLButtonElement).disabled = currentPage === totalPages;
    
    if (allRetenciones.length === 0 && tableBody) {
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No hay retenciones para mostrar.</td></tr>';
      return;
    }

    allRetenciones.forEach((item: any) => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50 transition duration-150 ease-in-out';
      row.innerHTML = `
        <td class="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${item.type}</td>
        <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-500">${item.rif}</td>
        <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-500">${item.nro_factura}</td>
        <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-500">${item.nro_comprobante}</td>
        <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-500">${new Date(item.fecha_documento).toLocaleDateString('es-VE')}</td>
        <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-500">${item.base_imponible.toFixed(2)}</td>
        <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-500">${item.monto_retenido.toFixed(2)}</td>
        <td class="px-6 py-2 whitespace-nowrap text-right text-sm font-medium flex gap-2">
          <a href="/api/download/${item.type.toLowerCase()}?${item.type === 'ISLR' ? `islr_rif=${item.original_islr_rif}&islr_nrofac=${item.original_islr_nrofac}&islr_nroret=${item.original_islr_nroret}` : `riva_rif=${item.original_riva_rif}&riva_nrocom=${item.original_riva_nrocom}&riva_nrofac=${item.original_riva_nrofac}`}" class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-csv"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 16h.01"/><path d="M12 16h.01"/><path d="M16 16h.01"/><path d="M8 20h.01"/><path d="M12 20h.01"/><path d="M16 20h.01"/></svg>
            CSV
          </a>
          <a href="/api/download/${item.type.toLowerCase()}-pdf?${item.type === 'ISLR' ? `islr_rif=${item.original_islr_rif}&islr_nrofac=${item.original_islr_nrofac}&islr_nroret=${item.original_islr_nroret}` : `riva_rif=${item.original_riva_rif}&riva_nrocom=${item.original_riva_nrocom}&riva_nrofac=${item.original_riva_nrofac}`}" class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L15 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M16 16H8"/></svg>
            PDF
          </a>
        </td>
      `;
      tableBody?.appendChild(row);
    });
  }

  let debounceTimeout: any;
  function debounce(func: any, delay: any) {
    return function(this: any, ...args: any) {
      const context = this;
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  const debouncedFetchData = debounce(fetchData, 300); // Debounce fetchData

  // Event Listeners
  searchInput?.addEventListener('input', debouncedFetchData);
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      debouncedFetchData();
    }
  });

  filterAllBtn?.addEventListener('click', () => {
    filterAllBtn?.classList.add('bg-blue-600', 'text-gray-700');
    filterAllBtn?.classList.remove('bg-gray-200', 'text-gray-700', 'border-gray-300');
    filterIslrBtn?.classList.remove('bg-blue-600', 'text-white');
    filterIslrBtn?.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    filterIvaBtn?.classList.remove('bg-blue-600', 'text-white');
    filterIvaBtn?.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    currentPage = 1; // Reset page on filter change
    fetchData();
  });

  filterIslrBtn?.addEventListener('click', () => {
    filterIslrBtn.classList.add('bg-blue-600', 'text-white');
    filterIslrBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
    filterAllBtn?.classList.remove('bg-blue-600', 'text-white');
    filterAllBtn?.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    filterIvaBtn?.classList.remove('bg-blue-600', 'text-white');
    filterIvaBtn?.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    currentPage = 1; // Reset page on filter change
    fetchData();
  });

  filterIvaBtn?.addEventListener('click', () => {
    filterIvaBtn.classList.add('bg-blue-600', 'text-white');
    filterIvaBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
    filterAllBtn?.classList.remove('bg-blue-600', 'text-white');
    filterAllBtn?.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    filterIslrBtn?.classList.remove('bg-blue-600', 'text-white');
    filterIslrBtn?.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    currentPage = 1; // Reset page on filter change
    fetchData();
  });

  tableHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const column = (header as HTMLElement).dataset.sort;
      if (column) {
        if (currentSortColumn === column) {
          currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortColumn = column;
          currentSortDirection = 'asc';
        }
        currentPage = 1; // Reset page on sort change
        fetchData();
      }
    });
  });

  prevPageBtn?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      fetchData();
    }
  });

  nextPageBtn?.addEventListener('click', () => {
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      fetchData();
    }
  });

  // Initial render and resize listener
  adjustTableLayout();
  window.addEventListener('resize', adjustTableLayout);
});