'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Package, ImageOff, Link as LinkIcon, Loader2, Search } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useNotifications } from '@/contexts/NotificationContext';

interface Product {
  id: string;
  name: string;
  price: number;
  info: string;
  imageUrl: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductFormData {
  name: string;
  price: string;
  info: string;
  imageUrl: string;
  category: string;
}

// Validate URL format
const isValidImageUrl = (url: string): boolean => {
  if (!url) return true; // Empty is OK
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Product Image component with fallback and failsafe timeout
function ProductImage({
  src,
  alt,
  className = '',
  showDebug = false,
}: {
  src: string;
  alt: string;
  className?: string;
  showDebug?: boolean;
}) {
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Reset loading state when src changes + failsafe timeout
  useEffect(() => {
    setImgLoading(true);
    setImgError(false);

    // Failsafe: never allow infinite spinner - stop after 3 seconds
    const timeout = setTimeout(() => {
      setImgLoading(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [src]);

  // Debug logging (temporary)
  if (showDebug) {
    console.log('ProductImage src:', src);
    console.log('ProductImage loading:', imgLoading, 'error:', imgError);
  }

  // Show placeholder if no src or image failed to load
  if (!src || imgError) {
    return (
      <div className={`bg-slate-700/50 flex flex-col items-center justify-center ${className}`}>
        <ImageOff className="w-12 h-12 text-slate-500 mb-2" />
        <span className="text-slate-500 text-xs">No Image</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Spinner: only show while loading AND no error */}
      {imgLoading && !imgError && (
        <div className="absolute inset-0 bg-slate-700/50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${imgLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setImgLoading(false)}
        onError={() => {
          setImgLoading(false);
          setImgError(true);
        }}
        style={{ display: imgError ? 'none' : 'block' }}
      />
    </div>
  );
}

// Product Card component
function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Debug logging (temporary)
  console.log('ProductCard imageUrl:', product.imageUrl);
  console.log('Full product object:', product);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-pink-500/30 transition-all group">
      {/* Image Container - relative positioning for overlay */}
      <div className="relative aspect-square">
        <ProductImage
          src={product.imageUrl || ''}
          alt={product.name}
          className="w-full h-full"
          showDebug={true}
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={onEdit}
            className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
          >
            <Pencil className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onDelete}
            className="p-3 bg-red-500/20 rounded-xl hover:bg-red-500/30 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-semibold truncate">{product.name}</h3>
        <p className="text-slate-400 text-sm mt-1 line-clamp-2">
          {product.info || 'No description'}
        </p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-pink-400 font-bold text-lg">
            ${product.price.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded-lg">
            {product.category || 'Uncategorized'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Product Form component
function ProductForm({
  initialData,
  onSave,
  onCancel,
  isSaving,
}: {
  initialData?: ProductFormData;
  onSave: (data: ProductFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<ProductFormData>(
    initialData || {
      name: '',
      price: '',
      info: '',
      imageUrl: '',
      category: '',
    }
  );
  const [urlError, setUrlError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    // Validate price
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    // Validate URL format
    if (formData.imageUrl && !isValidImageUrl(formData.imageUrl)) {
      setUrlError('URL must start with http:// or https://');
      return;
    }

    onSave(formData);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, imageUrl: url });

    if (url && !isValidImageUrl(url)) {
      setUrlError('URL must start with http:// or https://');
    } else {
      setUrlError('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image URL with Preview */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Image URL
        </label>
        <div className="flex gap-4">
          {/* Preview */}
          <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-white/10">
            <ProductImage
              src={formData.imageUrl}
              alt="Preview"
              className="w-full h-full"
            />
          </div>

          {/* URL Input */}
          <div className="flex-1">
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={formData.imageUrl}
                onChange={handleUrlChange}
                className={`w-full pl-10 pr-4 py-3 bg-slate-700 border rounded-xl text-white placeholder:text-slate-500 focus:outline-none transition-colors ${
                  urlError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-white/10 focus:border-pink-500/50'
                }`}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            {urlError && (
              <p className="text-red-400 text-xs mt-1">{urlError}</p>
            )}
            <p className="text-slate-500 text-xs mt-1">
              Enter a direct link to an image (PNG, JPG, WebP)
            </p>
          </div>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Product Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-slate-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50"
          placeholder="Enter product name"
          required
        />
      </div>

      {/* Price & Category Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Price *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full bg-slate-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50"
            placeholder="0.00"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Category
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full bg-slate-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50"
            placeholder="e.g., Electronics"
          />
        </div>
      </div>

      {/* Info/Description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Product Info
        </label>
        <textarea
          value={formData.info}
          onChange={(e) => setFormData({ ...formData, info: e.target.value })}
          className="w-full bg-slate-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-pink-500/50"
          rows={3}
          placeholder="Enter product description"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-4 sm:px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !!urlError}
          className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const { addNotification } = useNotifications();

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const info = (p.info || '').toLowerCase();
      const priceStr = String(p.price ?? '').toLowerCase();

      return (
        name.includes(q) ||
        category.includes(q) ||
        info.includes(q) ||
        priceStr.includes(q)
      );
    });
  }, [products, search]);

  // Debug logging (temporary)
  console.log('search:', search, 'products:', products.length, 'filtered:', filteredProducts.length);

  // Load products from Firebase with real-time updates
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Product[];

        // Sort by updatedAt descending
        productsData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        setProducts(productsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSave = async (formData: ProductFormData) => {
    setIsSaving(true);

    try {
      // Standardize imageUrl field - always save as string, never undefined
      const productData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        info: formData.info.trim(),
        imageUrl: formData.imageUrl?.trim() || '',
        category: formData.category.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        toast.success('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp(),
        });
        toast.success('Product added successfully');

        // Create notification for new product
        await addNotification({
          type: 'product',
          title: 'New product added',
          message: `${formData.name} has been added to the catalog`,
          link: '/dashboard/products',
        });
      }

      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success('Product deleted successfully');
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-slate-400 mt-1">Manage your product inventory</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-64 pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="relative">
            <ProductCard
              product={product}
              onEdit={() => openEditModal(product)}
              onDelete={() => handleDelete(product.id)}
            />
          </div>
        ))}

        {/* No Search Results */}
        {filteredProducts.length === 0 && products.length > 0 && search && (
          <div className="col-span-full text-center py-20">
            <Search className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No products found
            </h3>
            <p className="text-slate-400 mb-6">
              No products match &quot;{search}&quot;. Try a different search term.
            </p>
          </div>
        )}

        {/* Empty State */}
        {products.length === 0 && (
          <div className="col-span-full text-center py-20">
            <Package className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No products yet
            </h3>
            <p className="text-slate-400 mb-6">
              Add your first product to get started
            </p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium"
            >
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl w-full max-w-[600px] border border-white/10 my-8 mx-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <ProductForm
                initialData={
                  editingProduct
                    ? {
                        name: editingProduct.name,
                        price: editingProduct.price.toString(),
                        info: editingProduct.info || '',
                        imageUrl: editingProduct.imageUrl || '',
                        category: editingProduct.category || '',
                      }
                    : undefined
                }
                onSave={handleSave}
                onCancel={closeModal}
                isSaving={isSaving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
