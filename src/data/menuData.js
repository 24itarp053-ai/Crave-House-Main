import farmhouseImg from '../assets/images/farmhouse.jpg';
import cheeseBurstImg from '../assets/images/cheese-burst.jpg';
import paneerBurgerImg from '../assets/images/paneer-burger.jpg';
import crunchyBurgerImg from '../assets/images/crunchy-burger.jpg';
import pinkSaucePastaImg from '../assets/images/pink-sauce-pasta.jpg';
import gardenSaladImg from '../assets/images/garden-salad.jpg';
import coldCoffeeImg from '../assets/images/cold-coffee.jpg';
import chocolateBrownieImg from '../assets/images/chocolate-brownie.jpg';

export const menuItems = [
  {
    id: 1,
    name: 'Farmhouse Pizza',
    description: 'Fresh vegetables including onion, capsicum, mushroom, tomato, and mozzarella cheese.',
    price: '₹349',
    category: 'pizza',
    rating: 4.7,
    image: farmhouseImg,
    isVeg: true,
  },
  {
    id: 2,
    name: 'Cheese Burst Pizza',
    description: 'Soft crust filled with molten cheese and extra mozzarella topping.',
    price: '₹399',
    category: 'pizza',
    rating: 4.9,
    image: cheeseBurstImg,
    isVeg: true,
  },
  {
    id: 3,
    name: 'Paneer Burger',
    description: 'Grilled paneer tikka with spicy mayo and fresh lettuce.',
    price: '₹199',
    category: 'burger',
    rating: 4.8,
    image: paneerBurgerImg,
    isVeg: true,
  },
  {
    id: 4,
    name: 'Crunchy Burger',
    description: 'Extra crispy vegetable patty with crunchy toppings.',
    price: '₹209',
    category: 'burger',
    rating: 4.7,
    image: crunchyBurgerImg,
    isVeg: true,
  },
  {
    id: 5,
    name: 'Pink Sauce Pasta',
    description: 'A perfect blend of creamy white and tangy red sauce with exotic vegetables.',
    price: '₹259',
    category: 'pasta',
    rating: 4.7,
    image: pinkSaucePastaImg,
    isVeg: true,
  },
  {
    id: 6,
    name: 'Garden Salad',
    description: 'Fresh garden greens tossed with shredded carrots, cucumbers, and cherry tomatoes.',
    price: '₹149',
    category: 'salad',
    rating: 4.3,
    image: gardenSaladImg,
    isVeg: true,
  },
  {
    id: 7,
    name: 'Cold Coffee',
    description: 'Classic brewed coffee blended with milk and sugar, served chilled.',
    price: '₹179',
    category: 'drinks',
    rating: 4.6,
    image: coldCoffeeImg,
    isVeg: true,
  },
  {
    id: 8,
    name: 'Chocolate Brownie',
    description: 'Fudgy chocolate brownie loaded with chocolate chips and served warm.',
    price: '₹199',
    category: 'dessert',
    rating: 4.7,
    image: chocolateBrownieImg,
    isVeg: true,
  },
];
