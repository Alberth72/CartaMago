import { useCallback, useMemo, useState, type FormEvent } from 'react'
import type { MenuCategory, MenuItem } from '../../../data/restaurantSeed'
import { slugify } from '../../../services/menuRepository'
import {
  fetchAdminMenu,
  updateAdminRestaurant,
  uploadAdminProductImage,
  upsertAdminCategory,
  upsertAdminProduct,
  deleteAdminProduct,
  deleteAdminCategory,
} from '../repositories/adminMenuRepository'
import type { AdminProductForm, AdminRestaurantForm } from '../types'

const emptyProduct: AdminProductForm = {
  id: '',
  categoryId: '',
  name: '',
  description: '',
  price: '26000',
  badge: '',
  imageUrl: '',
  available: true,
}

const emptyRestaurant: AdminRestaurantForm = {
  name: '',
  shortName: '',
  whatsappNumber: '',
  location: '',
  headline: '',
  description: '',
  socialHandle: '',
}

export type ConfirmAction =
  | { type: 'delete-product'; productId: string; productName: string }
  | { type: 'delete-category'; categoryId: string; categoryName: string }
  | null

export function useAdminMenu() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<MenuItem[]>([])
  const [restaurantForm, setRestaurantForm] = useState<AdminRestaurantForm>(emptyRestaurant)
  const [productForm, setProductForm] = useState<AdminProductForm>(emptyProduct)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmAction>(null)

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === productForm.categoryId),
    [categories, productForm.categoryId],
  )
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const loadMenu = useCallback(async () => {
    setStatus('Cargando menu...')

    try {
      const nextMenu = await fetchAdminMenu()
      setRestaurantForm(nextMenu.restaurantForm)
      setCategories(nextMenu.categories)
      setProducts(nextMenu.products)
      setProductForm((current) => ({
        ...current,
        categoryId: current.categoryId || nextMenu.categories[0]?.id || '',
      }))
      setStatus('Menu cargado.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo cargar el menu.')
    }
  }, [])

  function clearMenu() {
    setProducts([])
    setCategories([])
  }

  function getProductAdminImage(product: MenuItem) {
    return product.imageUrl ?? categoryById.get(product.categoryId)?.image
  }

  function getProductImageLabel(product: MenuItem) {
    return product.imageUrl ? 'Imagen propia' : 'Imagen de categoria'
  }

  function updateRestaurantFormState(partial: Partial<AdminRestaurantForm>) {
    setRestaurantForm((current) => ({ ...current, ...partial }))
  }

  function updateProductFormState(partial: Partial<AdminProductForm>) {
    setProductForm((current) => ({ ...current, ...partial }))
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryName.trim()) return

    try {
      await upsertAdminCategory(categoryName, categoryDescription, categories.length + 1)
      setCategoryName('')
      setCategoryDescription('')
      setStatus('Categoria guardada.')
      await loadMenu()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar la categoria.')
    }
  }

  async function saveRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const whatsappNumber = restaurantForm.whatsappNumber.replace(/\D/g, '')

    if (!restaurantForm.name.trim() || !whatsappNumber) {
      setStatus('Nombre y WhatsApp son obligatorios.')
      return
    }

    if (whatsappNumber.length < 10 || whatsappNumber.length > 15) {
      setStatus('Usa WhatsApp en formato internacional, sin + ni espacios. Ejemplo: 573001234567.')
      return
    }

    setIsSaving(true)

    try {
      await updateAdminRestaurant(restaurantForm, whatsappNumber)
      setRestaurantForm((current) => ({ ...current, whatsappNumber }))
      setStatus('Datos del restaurante guardados. El QR publico usara este WhatsApp.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar el restaurante.')
    } finally {
      setIsSaving(false)
    }
  }

  function editProduct(product: MenuItem) {
    setProductForm({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: String(product.price ?? ''),
      badge: product.badge ?? '',
      imageUrl: product.imageUrl ?? '',
      available: product.available,
    })
  }

  function newProduct() {
    setProductForm({
      ...emptyProduct,
      categoryId: categories[0]?.id ?? '',
    })
  }

  function requestDeleteProduct(productId: string, productName: string) {
    setConfirm({ type: 'delete-product', productId, productName })
  }

  function requestDeleteCategory(categoryId: string, categoryName: string) {
    setConfirm({ type: 'delete-category', categoryId, categoryName })
  }

  function cancelConfirm() {
    setConfirm(null)
  }

  async function executeConfirm() {
    if (!confirm) return

    setIsSaving(true)
    try {
      if (confirm.type === 'delete-product') {
        await deleteAdminProduct(confirm.productId)
        setStatus('Producto eliminado.')
      } else if (confirm.type === 'delete-category') {
        await deleteAdminCategory(confirm.categoryId)
        setStatus('Categoria eliminada.')
      }
      setConfirm(null)
      await loadMenu()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo eliminar.')
    } finally {
      setIsSaving(false)
    }
  }

  async function uploadImage(file: File) {
    setStatus('Subiendo imagen...')

    try {
      const publicUrl = await uploadAdminProductImage(file, productForm.name)
      setProductForm((current) => ({ ...current, imageUrl: publicUrl }))
      setStatus('Imagen subida.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo subir la imagen.')
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!productForm.name.trim() || !productForm.categoryId) {
      setStatus('Nombre y categoria son obligatorios.')
      return
    }

    setIsSaving(true)
    const id = productForm.id || slugify(productForm.name)
    const product: MenuItem = {
      id,
      categoryId: productForm.categoryId,
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: productForm.price ? Number(productForm.price) : null,
      badge: productForm.badge.trim() || undefined,
      imageUrl: productForm.imageUrl || undefined,
      available: productForm.available,
    }
    const sortOrder = products.findIndex((item) => item.id === id) + 1 || products.length + 1

    try {
      await upsertAdminProduct(product, sortOrder)
      setStatus('Producto guardado.')
      setProductForm({ ...emptyProduct, categoryId: productForm.categoryId })
      await loadMenu()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar el producto.')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    categories,
    products,
    restaurantForm,
    productForm,
    categoryName,
    categoryDescription,
    selectedCategory,
    status,
    isSaving,
    confirm,
    setStatus,
    setCategoryName,
    setCategoryDescription,
    loadMenu,
    clearMenu,
    getProductAdminImage,
    getProductImageLabel,
    updateRestaurantForm: updateRestaurantFormState,
    updateProductForm: updateProductFormState,
    createCategory,
    saveRestaurant,
    editProduct,
    newProduct,
    requestDeleteProduct,
    requestDeleteCategory,
    cancelConfirm,
    executeConfirm,
    uploadImage,
    saveProduct,
  }
}