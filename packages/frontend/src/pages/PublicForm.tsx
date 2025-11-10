import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi, ProductSearchResult } from '../utils/api';
import { FormFieldSettings, DEFAULT_FORM_FIELD_SETTINGS } from '@invenflow/shared';

interface KanbanInfo {
  id: string;
  name: string;
  type: string;
  formFieldSettings?: FormFieldSettings | null;
}

interface Department {
  id: string;
  name: string;
}

export default function PublicForm() {
  const { token } = useParams<{ token: string }>();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Data states
  const [kanbanInfo, setKanbanInfo] = useState<KanbanInfo | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [areas, setAreas] = useState<string[]>([]);

  // Product search states
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form data
  const [formData, setFormData] = useState({
    requesterName: '',
    departmentId: '',
    area: '',
    itemName: '',
    itemUrl: '',
    quantity: '1',
    details: '',
    priority: '',
    notes: '',
    // Optional fields from product selection
    selectedProductId: '',
    category: '',
    supplier: '',
    sku: '',
    unitPrice: '',
  });

  // Helper function to check if a field is enabled
  const isFieldEnabled = (fieldKey: keyof FormFieldSettings): boolean => {
    const settings = kanbanInfo?.formFieldSettings || DEFAULT_FORM_FIELD_SETTINGS;
    return settings[fieldKey] ?? true;
  };

  // Fetch initial data
  useEffect(() => {
    if (token) {
      fetchInitialData();
    }
  }, [token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [kanbanData, departmentsData, areasData] = await Promise.all([
        publicApi.getKanbanInfo(token!),
        publicApi.getDepartments(),
        publicApi.getAreas(),
      ]);

      setKanbanInfo(kanbanData);
      setDepartments(departmentsData);
      setAreas(areasData);
      setError(null);
    } catch (error: any) {
      // Check if it's a 403 error (form disabled)
      if (error?.response?.status === 403) {
        setError('This form has been disabled by the administrator');
      } else {
        setError('Public form not found or has been disabled');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced product search
  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setProductSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await publicApi.searchProducts(query);
      setProductSearchResults(results);
    } catch (error) {
      console.error('Product search failed:', error);
      setProductSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleProductSearchChange = (value: string) => {
    setProductSearchQuery(value);
    setFormData({ ...formData, itemName: value });
    setShowProductDropdown(true);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(value);
    }, 300);
  };

  const handleSelectProduct = (product: ProductSearchResult) => {
    setFormData({
      ...formData,
      itemName: product.productDetails,
      selectedProductId: product.id,
      category: product.category || '',
      supplier: product.supplier || '',
      sku: product.sku || '',
      unitPrice: product.unitPrice || '',
    });
    setProductSearchQuery(product.productDetails);
    setShowProductDropdown(false);
  };

  const handleSelectNewProduct = () => {
    setFormData({
      ...formData,
      selectedProductId: '',
      category: '',
      supplier: '',
      sku: '',
      unitPrice: '',
    });
    setShowProductDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields (only if enabled)
    if (isFieldEnabled('requesterName') && !formData.requesterName.trim()) {
      alert('Requester name is required');
      return;
    }

    if (isFieldEnabled('department') && !formData.departmentId) {
      alert('Department is required');
      return;
    }

    // Item name is always required
    if (!formData.itemName.trim()) {
      alert('Item name is required');
      return;
    }

    if (isFieldEnabled('quantity') && (!formData.quantity || parseInt(formData.quantity) < 1)) {
      alert('Quantity must be at least 1');
      return;
    }

    if (isFieldEnabled('priority') && !formData.priority) {
      alert('Priority is required');
      return;
    }

    try {
      setSubmitting(true);
      
      // Build submission data with only enabled fields
      const submissionData: any = {
        itemName: formData.itemName.trim(), // Always required
        productId: formData.selectedProductId || undefined,
        category: formData.category || undefined,
        supplier: formData.supplier || undefined,
        sku: formData.sku || undefined,
        unitPrice: formData.unitPrice || undefined,
      };

      // Add optional fields only if enabled
      if (isFieldEnabled('requesterName')) {
        submissionData.requesterName = formData.requesterName.trim();
      }
      if (isFieldEnabled('department')) {
        submissionData.departmentId = formData.departmentId;
      }
      if (isFieldEnabled('location')) {
        submissionData.area = formData.area || undefined;
      }
      if (isFieldEnabled('itemUrl')) {
        submissionData.itemUrl = formData.itemUrl.trim() || undefined;
      }
      if (isFieldEnabled('quantity')) {
        submissionData.quantity = parseInt(formData.quantity);
      }
      if (isFieldEnabled('priority')) {
        submissionData.priority = formData.priority;
      }
      if (isFieldEnabled('details')) {
        submissionData.details = formData.details.trim() || undefined;
      }
      if (isFieldEnabled('notes')) {
        submissionData.notes = formData.notes.trim() || undefined;
      }

      await publicApi.submitForm(token!, submissionData);

      setSubmitted(true);
      setFormData({
        requesterName: '',
        departmentId: '',
        area: '',
        itemName: '',
        itemUrl: '',
        quantity: '1',
        details: '',
        priority: '',
        notes: '',
        selectedProductId: '',
        category: '',
        supplier: '',
        sku: '',
        unitPrice: '',
      });
      setProductSearchQuery('');
    } catch (error) {
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading form...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-8">
            {/* Error Icon */}
            <div className="mb-4">
              <svg 
                className="w-16 h-16 text-red-500 mx-auto" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            {/* Error Message */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error.includes('disabled') ? 'Form Disabled' : 'Form Not Available'}
            </h2>
            <p className="text-red-600 text-lg mb-6">{error}</p>
            
            {/* Additional Info */}
            {error.includes('disabled') && (
              <p className="text-gray-600 text-sm mb-6">
                The administrator has temporarily disabled this form. 
                Please contact them if you need to submit a request.
              </p>
            )}
            
            {/* Actions */}
            <button
              onClick={() => window.history.back()}
              className="btn-secondary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your product request has been successfully submitted to <strong>{kanbanInfo?.name}</strong>.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="btn-primary"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Product Request</h2>
          {kanbanInfo && (
            <p className="text-gray-600">
              Submitting to: <strong>{kanbanInfo.name}</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Requester Name */}
          {isFieldEnabled('requesterName') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requester Name *
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name"
                value={formData.requesterName}
                onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                required
              />
            </div>
          )}

          {/* Department */}
          {isFieldEnabled('department') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department *
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                required
              >
                <option value="">Select department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location (Area) */}
          {isFieldEnabled('location') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              >
                <option value="">Select location</option>
                {areas.map(area => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Item Name with Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search for existing product or enter new item name"
              value={productSearchQuery}
              onChange={(e) => handleProductSearchChange(e.target.value)}
              onFocus={() => setShowProductDropdown(true)}
              required
            />
            
            {/* Autocomplete Dropdown */}
            {showProductDropdown && (productSearchQuery.length >= 2) && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {isSearching ? (
                  <div className="p-3 text-gray-500 text-center">Searching...</div>
                ) : productSearchResults.length > 0 ? (
                  <>
                    {productSearchResults.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        className="w-full text-left p-3 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="font-medium text-gray-900">{product.productDetails}</div>
                        <div className="text-sm text-gray-500">
                          {product.sku && `SKU: ${product.sku}`}
                          {product.category && ` | Category: ${product.category}`}
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="w-full text-left p-3 hover:bg-gray-100 text-blue-600 font-medium"
                      onClick={handleSelectNewProduct}
                    >
                      + Add new product: "{productSearchQuery}"
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="w-full text-left p-3 hover:bg-gray-100 text-blue-600 font-medium"
                    onClick={handleSelectNewProduct}
                  >
                    + Add new product: "{productSearchQuery}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Item URL */}
          {isFieldEnabled('itemUrl') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item URL
              </label>
              <input
                type="url"
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/product"
                value={formData.itemUrl}
                onChange={(e) => setFormData({ ...formData, itemUrl: e.target.value })}
              />
            </div>
          )}

          {/* Quantity and Priority */}
          {(isFieldEnabled('quantity') || isFieldEnabled('priority')) && (
            <div className={`grid gap-4 ${
              isFieldEnabled('quantity') && isFieldEnabled('priority') 
                ? 'grid-cols-1 md:grid-cols-2' 
                : 'grid-cols-1'
            }`}>
              {isFieldEnabled('quantity') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Quantity"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
              )}
              {isFieldEnabled('priority') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    required
                  >
                    <option value="">Select priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Details */}
          {isFieldEnabled('details') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Details
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional product description or specifications..."
                rows={3}
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </div>
          )}

          {/* Notes */}
          {isFieldEnabled('notes') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional comments or special instructions..."
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
