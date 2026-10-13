import pizzaImage from '../assets/images/pizza.png';
import burgerImage from '../assets/images/burger.png';
import pastaImage from '../assets/images/pasta.png';
import saladImage from '../assets/images/salad.png';
import drinksImage from '../assets/images/drinks.png';
import dessertsImage from '../assets/images/desserts.png';

export const categories = [
  {
    name: 'Pizza',
    slug: 'pizza',
    icon: '🍕',
    image: pizzaImage,
    path: '/menu/pizza',
    button: 'Explore Pizza',
    description: 'Freshly baked pizzas loaded with premium cheese and farm-fresh vegetables.',
    position: '8% center',
  },
  {
    name: 'Burger',
    slug: 'burger',
    icon: '🍔',
    image: burgerImage,
    path: '/menu/burger',
    button: 'Explore Burger',
    description: 'Juicy handcrafted vegetarian burgers with crispy patties and delicious sauces.',
    position: '29% center',
  },
  {
    name: 'Pasta',
    slug: 'pasta',
    icon: '🍝',
    image: pastaImage,
    path: '/menu/pasta',
    button: 'Explore Pasta',
    description: 'Creamy and cheesy Italian pasta made with authentic herbs and fresh ingredients.',
    position: '99% center',
  },
  {
    name: 'Salad',
    slug: 'salad',
    icon: '🥗',
    image: saladImage,
    path: '/menu/salad',
    button: 'Explore Salad',
    description: 'Healthy, colorful salads made with fresh vegetables and homemade dressings.',
    position: '48% center',
  },
  {
    name: 'Drinks',
    slug: 'drinks',
    icon: '🍹',
    image: drinksImage,
    path: '/menu/drinks',
    button: 'Explore Drinks',
    description: 'Refreshing shakes, mojitos, lemonades and signature beverages.',
    position: '68% center',
  },
  {
    name: 'Desserts',
    slug: 'desserts',
    icon: '🍰',
    image: dessertsImage,
    path: '/menu/desserts',
    button: 'Explore Desserts',
    description: 'Delicious cakes, brownies, cheesecakes and sweet treats for every craving.',
    position: '88% center',
  },
];
