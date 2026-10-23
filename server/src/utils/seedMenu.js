const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

// Load environment variables
dotenv.config();

const categoriesData = [
  {
    name: 'Pizza',
    slug: 'pizza',
    description: 'Freshly baked pizzas loaded with premium cheese and farm-fresh vegetables.',
    image: '/src/assets/images/pizza.png',
    displayOrder: 1,
    isActive: true
  },
  {
    name: 'Burgers',
    slug: 'burgers',
    description: 'Juicy handcrafted vegetarian burgers with crispy patties and delicious sauces.',
    image: '/src/assets/images/burger.png',
    displayOrder: 2,
    isActive: true
  },
  {
    name: 'Pasta',
    slug: 'pasta',
    description: 'Creamy and cheesy Italian pasta made with authentic herbs and fresh ingredients.',
    image: '/src/assets/images/pasta.png',
    displayOrder: 3,
    isActive: true
  },
  {
    name: 'Salads',
    slug: 'salads',
    description: 'Healthy, colorful salads made with fresh vegetables and homemade dressings.',
    image: '/src/assets/images/salad.png',
    displayOrder: 4,
    isActive: true
  },
  {
    name: 'Drinks',
    slug: 'drinks',
    description: 'Refreshing shakes, mojitos, lemonades and signature beverages.',
    image: '/src/assets/images/drinks.png',
    displayOrder: 5,
    isActive: true
  },
  {
    name: 'Desserts',
    slug: 'desserts',
    description: 'Delicious cakes, brownies, cheesecakes and sweet treats for every craving.',
    image: '/src/assets/images/desserts.png',
    displayOrder: 6,
    isActive: true
  }
];

const menuItemsData = {
  pizza: [
    {
      name: 'Margherita Pizza',
      slug: 'margherita-pizza',
      price: 249,
      description: 'Classic pizza topped with mozzarella cheese, tomato sauce, and fresh basil.',
      rating: 4.8,
      image: '/src/assets/images/margherita.jpg',
      isPopular: true,
      ingredients: ['Hand-Tossed Dough', 'San Marzano Tomato Sauce', 'Premium Mozzarella', 'Basil Leaves', 'Extra Virgin Olive Oil'],
      nutrition: { calories: '290 kcal (per slice)', protein: '10g', fat: '9g', carbs: '32g' }
    },
    {
      name: 'Farmhouse Pizza',
      slug: 'farmhouse-pizza',
      price: 349,
      description: 'Fresh vegetables including onion, capsicum, mushroom, tomato, and mozzarella cheese.',
      rating: 4.7,
      image: '/src/assets/images/farmhouse.jpg',
      ingredients: ['Hand-Tossed Dough', 'San Marzano Tomato Sauce', 'Premium Mozzarella', 'Basil Leaves', 'Extra Virgin Olive Oil'],
      nutrition: { calories: '290 kcal (per slice)', protein: '10g', fat: '9g', carbs: '32g' }
    },
    {
      name: 'Paneer Tikka Pizza',
      slug: 'paneer-tikka-pizza',
      price: 379,
      description: 'Indian-style paneer tikka with onions, capsicum, and rich cheese.',
      rating: 4.9,
      image: '/src/assets/images/paneer-tikka.jpg',
      isPopular: true,
      ingredients: ['Hand-Tossed Dough', 'San Marzano Tomato Sauce', 'Premium Mozzarella', 'Basil Leaves', 'Extra Virgin Olive Oil'],
      nutrition: { calories: '290 kcal (per slice)', protein: '10g', fat: '9g', carbs: '32g' }
    },
    {
      name: 'Veggie Supreme',
      slug: 'veggie-supreme-pizza',
      price: 359,
      description: 'Loaded with fresh vegetables, mushrooms, black olives, and premium mozzarella cheese.',
      rating: 4.8,
      image: '/src/assets/images/veggie-supreme.jpg',
      ingredients: ['Hand-Tossed Dough', 'San Marzano Tomato Sauce', 'Premium Mozzarella', 'Basil Leaves', 'Extra Virgin Olive Oil'],
      nutrition: { calories: '290 kcal (per slice)', protein: '10g', fat: '9g', carbs: '32g' }
    },
    {
      name: 'Cheese Burst Pizza',
      slug: 'cheese-burst-pizza',
      price: 399,
      description: 'Soft crust filled with molten cheese and extra mozzarella topping.',
      rating: 4.9,
      image: '/src/assets/images/cheese-burst.jpg',
      isPopular: true,
      ingredients: ['Hand-Tossed Dough', 'San Marzano Tomato Sauce', 'Premium Mozzarella', 'Basil Leaves', 'Extra Virgin Olive Oil'],
      nutrition: { calories: '290 kcal (per slice)', protein: '10g', fat: '9g', carbs: '32g' }
    },
    {
      name: 'Mexican Green Wave',
      slug: 'mexican-green-wave-pizza',
      price: 389,
      description: 'Jalapeños, sweet corn, onions, capsicum, herbs, and mozzarella cheese.',
      rating: 4.7,
      image: '/src/assets/images/mexican-green-wave.jpg',
      ingredients: ['Hand-Tossed Dough', 'San Marzano Tomato Sauce', 'Premium Mozzarella', 'Basil Leaves', 'Extra Virgin Olive Oil'],
      nutrition: { calories: '290 kcal (per slice)', protein: '10g', fat: '9g', carbs: '32g' }
    }
  ],
  burgers: [
    {
      name: 'Veg Classic Burger',
      slug: 'veg-classic-burger',
      price: 149,
      description: 'A crispy vegetable patty with lettuce, tomato, onion, and house sauce.',
      rating: 4.5,
      image: '/src/assets/images/veg-classic-burger.jpg',
      ingredients: ['Premium Wheat Bun', 'Fresh Lettuce', 'Sliced Tomatoes', 'Red Onions', 'Crisp Veggie Patty', 'Cheddar Cheese', 'House Special Sauce'],
      nutrition: { calories: '320 kcal', protein: '12g', fat: '14g', carbs: '38g' }
    },
    {
      name: 'Cheese Burger',
      slug: 'cheese-burger',
      price: 179,
      description: 'Loaded with melted cheese, crispy patty, and fresh vegetables.',
      rating: 4.6,
      image: '/src/assets/images/cheese-burger.jpg',
      isPopular: true,
      ingredients: ['Premium Wheat Bun', 'Fresh Lettuce', 'Sliced Tomatoes', 'Red Onions', 'Crisp Veggie Patty', 'Cheddar Cheese', 'House Special Sauce'],
      nutrition: { calories: '320 kcal', protein: '12g', fat: '14g', carbs: '38g' }
    },
    {
      name: 'Paneer Burger',
      slug: 'paneer-burger',
      price: 199,
      description: 'Grilled paneer tikka with spicy mayo and fresh lettuce.',
      rating: 4.8,
      image: '/src/assets/images/paneer-burger.jpg',
      isPopular: true,
      ingredients: ['Premium Wheat Bun', 'Fresh Lettuce', 'Sliced Tomatoes', 'Red Onions', 'Crisp Veggie Patty', 'Cheddar Cheese', 'House Special Sauce'],
      nutrition: { calories: '320 kcal', protein: '12g', fat: '14g', carbs: '38g' }
    },
    {
      name: 'Corn Cheese Burger',
      slug: 'corn-cheese-burger',
      price: 189,
      description: 'Corn and cheese patty served with creamy sauce.',
      rating: 4.4,
      image: '/src/assets/images/corn-cheese-burger.jpg',
      ingredients: ['Premium Wheat Bun', 'Fresh Lettuce', 'Sliced Tomatoes', 'Red Onions', 'Crisp Veggie Patty', 'Cheddar Cheese', 'House Special Sauce'],
      nutrition: { calories: '320 kcal', protein: '12g', fat: '14g', carbs: '38g' }
    },
    {
      name: 'Crunchy Burger',
      slug: 'crunchy-burger',
      price: 209,
      description: 'Extra crispy vegetable patty with crunchy toppings.',
      rating: 4.7,
      image: '/src/assets/images/crunchy-burger.jpg',
      ingredients: ['Premium Wheat Bun', 'Fresh Lettuce', 'Sliced Tomatoes', 'Red Onions', 'Crisp Veggie Patty', 'Cheddar Cheese', 'House Special Sauce'],
      nutrition: { calories: '320 kcal', protein: '12g', fat: '14g', carbs: '38g' }
    }
  ],
  pasta: [
    {
      name: 'White Sauce Pasta',
      slug: 'white-sauce-pasta',
      price: 249,
      description: 'Rich and creamy white sauce pasta loaded with fresh veggies and Italian herbs.',
      rating: 4.6,
      image: '/src/assets/images/white-sauce-pasta.jpg',
      ingredients: ['Durum Wheat Pasta', 'Fresh Garlic', 'Extra Virgin Olive Oil', 'Exotic Veggies', 'Creamy Sauces', 'Parmesan Cheese', 'Italian Herbs'],
      nutrition: { calories: '410 kcal', protein: '14g', fat: '16g', carbs: '52g' }
    },
    {
      name: 'Red Sauce Pasta',
      slug: 'red-sauce-pasta',
      price: 239,
      description: 'Tangy tomato sauce pasta cooked to perfection with garlic and cheese.',
      rating: 4.5,
      image: '/src/assets/images/red-sauce-pasta.jpg',
      ingredients: ['Durum Wheat Pasta', 'Fresh Garlic', 'Extra Virgin Olive Oil', 'Exotic Veggies', 'Creamy Sauces', 'Parmesan Cheese', 'Italian Herbs'],
      nutrition: { calories: '410 kcal', protein: '14g', fat: '16g', carbs: '52g' }
    },
    {
      name: 'Pink Sauce Pasta',
      slug: 'pink-sauce-pasta',
      price: 259,
      description: 'A perfect blend of creamy white and tangy red sauce with exotic vegetables.',
      rating: 4.7,
      image: '/src/assets/images/pink-sauce-pasta.jpg',
      isPopular: true,
      ingredients: ['Durum Wheat Pasta', 'Fresh Garlic', 'Extra Virgin Olive Oil', 'Exotic Veggies', 'Creamy Sauces', 'Parmesan Cheese', 'Italian Herbs'],
      nutrition: { calories: '410 kcal', protein: '14g', fat: '16g', carbs: '52g' }
    },
    {
      name: 'Alfredo Pasta',
      slug: 'alfredo-pasta',
      price: 279,
      description: 'Authentic Italian Alfredo pasta tossed in a rich butter and parmesan cheese sauce.',
      rating: 4.8,
      image: '/src/assets/images/alfredo-pasta.jpg',
      ingredients: ['Durum Wheat Pasta', 'Fresh Garlic', 'Extra Virgin Olive Oil', 'Exotic Veggies', 'Creamy Sauces', 'Parmesan Cheese', 'Italian Herbs'],
      nutrition: { calories: '410 kcal', protein: '14g', fat: '16g', carbs: '52g' }
    },
    {
      name: 'Cheese Pasta',
      slug: 'cheese-pasta',
      price: 289,
      description: 'Decadent oven-baked pasta layered with premium mozzarella and cheddar cheese.',
      rating: 4.9,
      image: '/src/assets/images/cheese-pasta.jpg',
      ingredients: ['Durum Wheat Pasta', 'Fresh Garlic', 'Extra Virgin Olive Oil', 'Exotic Veggies', 'Creamy Sauces', 'Parmesan Cheese', 'Italian Herbs'],
      nutrition: { calories: '410 kcal', protein: '14g', fat: '16g', carbs: '52g' }
    }
  ],
  salads: [
    {
      name: 'Greek Salad',
      slug: 'greek-salad',
      price: 169,
      description: 'Crisp cucumbers, juicy tomatoes, olives, red onions, and rich feta cheese.',
      rating: 4.5,
      image: '/src/assets/images/greek-salad.jpg',
      ingredients: ['Romaine Lettuce', 'Organic Cherry Tomatoes', 'Sliced Cucumbers', 'Kalamata Olives', 'Feta Cheese', 'Homemade Vinaigrette Dressing'],
      nutrition: { calories: '180 kcal', protein: '4g', fat: '12g', carbs: '15g' }
    },
    {
      name: 'Garden Salad',
      slug: 'garden-salad',
      price: 149,
      description: 'Fresh garden greens tossed with shredded carrots, cucumbers, and cherry tomatoes.',
      rating: 4.3,
      image: '/src/assets/images/garden-salad.jpg',
      ingredients: ['Romaine Lettuce', 'Organic Cherry Tomatoes', 'Sliced Cucumbers', 'Kalamata Olives', 'Feta Cheese', 'Homemade Vinaigrette Dressing'],
      nutrition: { calories: '180 kcal', protein: '4g', fat: '12g', carbs: '15g' }
    },
    {
      name: 'Corn Salad',
      slug: 'corn-salad',
      price: 159,
      description: 'Sweet corn, colorful bell peppers, and fresh herbs in a light citrus dressing.',
      rating: 4.4,
      image: '/src/assets/images/corn-salad.jpg',
      ingredients: ['Romaine Lettuce', 'Organic Cherry Tomatoes', 'Sliced Cucumbers', 'Kalamata Olives', 'Feta Cheese', 'Homemade Vinaigrette Dressing'],
      nutrition: { calories: '180 kcal', protein: '4g', fat: '12g', carbs: '15g' }
    },
    {
      name: 'Caesar Veg Salad',
      slug: 'caesar-veg-salad',
      price: 189,
      description: 'Crisp romaine lettuce, crunchy croutons, and parmesan tossed in creamy Caesar dressing.',
      rating: 4.7,
      image: '/src/assets/images/caesar-veg-salad.jpg',
      isPopular: true,
      ingredients: ['Romaine Lettuce', 'Organic Cherry Tomatoes', 'Sliced Cucumbers', 'Kalamata Olives', 'Feta Cheese', 'Homemade Vinaigrette Dressing'],
      nutrition: { calories: '180 kcal', protein: '4g', fat: '12g', carbs: '15g' }
    },
    {
      name: 'Cucumber Salad',
      slug: 'cucumber-salad',
      price: 139,
      description: 'Thinly sliced cucumbers and onions dressed in a refreshing vinaigrette.',
      rating: 4.2,
      image: '/src/assets/images/cucumber-salad.jpg',
      ingredients: ['Romaine Lettuce', 'Organic Cherry Tomatoes', 'Sliced Cucumbers', 'Kalamata Olives', 'Feta Cheese', 'Homemade Vinaigrette Dressing'],
      nutrition: { calories: '180 kcal', protein: '4g', fat: '12g', carbs: '15g' }
    }
  ],
  drinks: [
    {
      name: 'Oreo Shake',
      slug: 'oreo-shake',
      price: 199,
      description: 'Creamy thick shake blended with classic Oreo cookies and rich vanilla ice cream.',
      rating: 4.8,
      image: '/src/assets/images/oreo-shake.jpg',
      ingredients: ['Fresh Whole Milk', 'Premium Flavor Blends', 'Natural Cane Sugar', 'Fresh Mint', 'Squeezed Lime', 'Ice Cream Creamer'],
      nutrition: { calories: '250 kcal', protein: '6g', fat: '8g', carbs: '38g' }
    },
    {
      name: 'Chocolate Shake',
      slug: 'chocolate-shake',
      price: 219,
      description: 'Decadent milkshake made with premium dark chocolate syrup and cocoa.',
      rating: 4.7,
      image: '/src/assets/images/chocolate-shake.jpg',
      ingredients: ['Fresh Whole Milk', 'Premium Flavor Blends', 'Natural Cane Sugar', 'Fresh Mint', 'Squeezed Lime', 'Ice Cream Creamer'],
      nutrition: { calories: '250 kcal', protein: '6g', fat: '8g', carbs: '38g' }
    },
    {
      name: 'Cold Coffee',
      slug: 'cold-coffee',
      price: 179,
      description: 'Classic brewed coffee blended with milk and sugar, served chilled.',
      rating: 4.6,
      image: '/src/assets/images/cold-coffee.jpg',
      isPopular: true,
      ingredients: ['Fresh Whole Milk', 'Premium Flavor Blends', 'Natural Cane Sugar', 'Fresh Mint', 'Squeezed Lime', 'Ice Cream Creamer'],
      nutrition: { calories: '250 kcal', protein: '6g', fat: '8g', carbs: '38g' }
    },
    {
      name: 'Mango Shake',
      slug: 'mango-shake',
      price: 199,
      description: 'Fresh mango pulp blended with rich milk and topped with cherry.',
      rating: 4.5,
      image: '/src/assets/images/mango-shake.jpg',
      ingredients: ['Fresh Whole Milk', 'Premium Flavor Blends', 'Natural Cane Sugar', 'Fresh Mint', 'Squeezed Lime', 'Ice Cream Creamer'],
      nutrition: { calories: '250 kcal', protein: '6g', fat: '8g', carbs: '38g' }
    },
    {
      name: 'Lemonade',
      slug: 'lemonade',
      price: 99,
      description: 'Freshly squeezed lemon juice with sugar and a hint of mint.',
      rating: 4.4,
      image: '/src/assets/images/lemonade.jpg',
      ingredients: ['Fresh Whole Milk', 'Premium Flavor Blends', 'Natural Cane Sugar', 'Fresh Mint', 'Squeezed Lime', 'Ice Cream Creamer'],
      nutrition: { calories: '250 kcal', protein: '6g', fat: '8g', carbs: '38g' }
    }
  ],
  desserts: [
    {
      name: 'Red Velvet Cake',
      slug: 'red-velvet-cake',
      price: 229,
      description: 'Soft and velvety red cake layers with rich cream cheese frosting.',
      rating: 4.8,
      image: '/src/assets/images/red-velvet-cake.jpg',
      ingredients: ['Dark Cocoa Cocoa Powder', 'Whipped Cream Cheese', 'Organic Cane Sugar', 'Butter', 'Vanilla Extract', 'Chocolate Chips'],
      nutrition: { calories: '380 kcal', protein: '5g', fat: '18g', carbs: '45g' }
    },
    {
      name: 'Chocolate Brownie',
      slug: 'chocolate-brownie',
      price: 199,
      description: 'Fudgy chocolate brownie loaded with chocolate chips and served warm.',
      rating: 4.7,
      image: '/src/assets/images/chocolate-brownie.jpg',
      ingredients: ['Dark Cocoa Cocoa Powder', 'Whipped Cream Cheese', 'Organic Cane Sugar', 'Butter', 'Vanilla Extract', 'Chocolate Chips'],
      nutrition: { calories: '380 kcal', protein: '5g', fat: '18g', carbs: '45g' }
    },
    {
      name: 'Cheesecake',
      slug: 'cheesecake',
      price: 249,
      description: 'Classic baked New York style cheesecake with a sweet graham cracker crust.',
      rating: 4.9,
      image: '/src/assets/images/cheesecake.jpg',
      isPopular: true,
      ingredients: ['Dark Cocoa Cocoa Powder', 'Whipped Cream Cheese', 'Organic Cane Sugar', 'Butter', 'Vanilla Extract', 'Chocolate Chips'],
      nutrition: { calories: '380 kcal', protein: '5g', fat: '18g', carbs: '45g' }
    },
    {
      name: 'Chocolate Lava Cake',
      slug: 'chocolate-lava-cake',
      price: 219,
      description: 'Warm chocolate cake filled with a gooey liquid chocolate center.',
      rating: 4.8,
      image: '/src/assets/images/chocolate-lava-cake.jpg',
      ingredients: ['Dark Cocoa Cocoa Powder', 'Whipped Cream Cheese', 'Organic Cane Sugar', 'Butter', 'Vanilla Extract', 'Chocolate Chips'],
      nutrition: { calories: '380 kcal', protein: '5g', fat: '18g', carbs: '45g' }
    },
    {
      name: 'Tiramisu',
      slug: 'tiramisu',
      price: 279,
      description: 'Authentic Italian dessert made of coffee-dipped ladyfingers and sweet mascarpone.',
      rating: 4.9,
      image: '/src/assets/images/tiramisu.jpg',
      ingredients: ['Dark Cocoa Cocoa Powder', 'Whipped Cream Cheese', 'Organic Cane Sugar', 'Butter', 'Vanilla Extract', 'Chocolate Chips'],
      nutrition: { calories: '380 kcal', protein: '5g', fat: '18g', carbs: '45g' }
    }
  ]
};

const seedMenu = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoURI) {
    console.error('Error: MONGODB_URI (or MONGO_URI) is not defined in environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected for seeding menu data...');

    let categoriesCreated = 0;
    let menuItemsCreated = 0;

    // Seed Categories
    for (const catData of categoriesData) {
      let category = await Category.findOne({ slug: catData.slug });
      if (!category) {
        category = await Category.create(catData);
        console.log(`Seeded category: ${category.name} (${category.slug})`);
        categoriesCreated++;
      } else {
        if ((category.displayOrder === undefined || category.displayOrder === null) && catData.displayOrder !== undefined) {
          category.displayOrder = catData.displayOrder;
          await category.save();
        }
        console.log(`Category exists: ${category.name}. Skipping.`);
      }

      // Seed Menu Items for this Category
      const items = menuItemsData[catData.slug] || [];
      for (const itemData of items) {
        const itemExists = await MenuItem.findOne({ slug: itemData.slug });
        if (!itemExists) {
          await MenuItem.create({
            ...itemData,
            category: category._id
          });
          console.log(`  Seeded menu item: ${itemData.name}`);
          menuItemsCreated++;
        } else {
          console.log(`  Menu item exists: ${itemData.name}. Skipping.`);
        }
      }
    }

    console.log(`Menu seeding completed. Created ${categoriesCreated} categories and ${menuItemsCreated} menu items.`);
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Error during menu seeding: ${error.message}`);
    process.exit(1);
  }
};

seedMenu();
