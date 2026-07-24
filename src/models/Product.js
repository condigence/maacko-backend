// import {Schema, model} from 'mongoose';

// const productSchema = new Schema({
//   name: { type: String, required: true },
//   price: { type: Number, default: 0 },
//   createdAt: { type: Date, default: Date.now },
// });

// export default model('Product', productSchema);


import {Schema, model} from 'mongoose';

// 1. Variant Schema (Embeds image array, attributes, and inventory/pricing)
const variantSchema = new Schema({
  variant_name: { type: String, required: true }, // e.g., "iPhone 16 - 128GB Black"
  sku: { type: String, required: true, unique: true },
  barcode: { type: String, default: null },
  
  // Pricing
  price: { type: Number, required: true },
  selling_price: { type: Number, required: true },
  cost_price: { type: Number },

  // Attributes (Mapped cleanly as Key-Value)
  color: { type: String },
  size: { type: String },
  ram: { type: String },
  storage: { type: String },
  weight: { type: String },
  model: { type: String },
  
  // Dynamic Attributes (for flexibility)
  attributes: [{
    attribute_name: String,
    value: String
  }],

  // Inventory Management
  stock: { type: Number, default: 0 },
  reserved_stock: { type: Number, default: 0 },
  low_stock: { type: Number, default: 5 },

  // Images directly embedded inside the variant
  images: [{
    image_url: { type: String, required: true },
    sort_order: { type: Number, default: 0 },
    primary_image: { type: Boolean, default: false }
  }],

  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { _id: true });


// 2. Main Product Schema
const productSchema = new Schema({
  // Expressive Product ID (or you can use Mongoose's default _id)
  product_id: { type: String, required: true, unique: true },

  // Foreign key references to other DB tables (Vendor, Category, Brand, Tax)
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  tax_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tax' },

  // Product Basic Info
  product_name: { type: String, required: true, trim: true },
  image: { type: String }, // Main display thumbnail
  barcode: { type: String },
  hsn_code: { type: String },
  description: { type: String },
  short_description: { type: String },

  // Status & Approvals
  status: { type: String, enum: ['draft', 'active', 'inactive'], default: 'draft' },
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

  // Business Rules
  warranty: { type: String },
  return_days: { type: Number, default: 0 },
  replacement_days: { type: Number, default: 0 },
  cod_available: { type: Boolean, default: true },
  country_origin: { type: String, default: 'India' },

  // Tags (Replaces PRODUCT TAG & PRODUCT TAG MAP)
  tags: [{ type: String }], 

  // Media
  video: {
    video_url: String,
    thumbnail: String
  },

  // Embedded Array of Variants (Replaces PRODUCT VARIANT)
  variants: [variantSchema]

}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Indexing for high performance search
productSchema.index({ product_name: 'text', tags: 'text' });

const Product = model('Product', productSchema);
export default Product;