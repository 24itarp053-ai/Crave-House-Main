import margheritaImg from '../assets/images/margherita.jpg';
import farmhouseImg from '../assets/images/farmhouse.jpg';
import paneerTikkaImg from '../assets/images/paneer-tikka.jpg';
import mexicanGreenWaveImg from '../assets/images/mexican-green-wave.jpg';
import veggieSupremeImg from '../assets/images/veggie-supreme.jpg';
import cheeseBurstImg from '../assets/images/cheese-burst.jpg';

const pizzaData = [
  {
    id: 1,
    name: 'Margherita Pizza',
    price: '₹249',
    description: 'Classic pizza topped with mozzarella cheese, tomato sauce, and fresh basil.',
    rating: 4.8,
    image: margheritaImg,
  },
  {
    id: 2,
    name: 'Farmhouse Pizza',
    price: '₹349',
    description: 'Fresh vegetables including onion, capsicum, mushroom, tomato, and mozzarella cheese.',
    rating: 4.7,
    image: farmhouseImg,
  },
  {
    id: 3,
    name: 'Paneer Tikka Pizza',
    price: '₹379',
    description: 'Indian-style paneer tikka with onions, capsicum, and rich cheese.',
    rating: 4.9,
    image: paneerTikkaImg,
  },
  {
    id: 4,
    name: 'Veggie Supreme',
    price: '₹359',
    description: 'Loaded with fresh vegetables, mushrooms, black olives, and premium mozzarella cheese.',
    rating: 4.8,
    image: veggieSupremeImg,
  },
  {
    id: 5,
    name: 'Cheese Burst Pizza',
    price: '₹399',
    description: 'Soft crust filled with molten cheese and extra mozzarella topping.',
    rating: 4.9,
    image: cheeseBurstImg,
  },
  {
    id: 6,
    name: 'Mexican Green Wave',
    price: '₹389',
    description: 'Jalapeños, sweet corn, onions, capsicum, herbs, and mozzarella cheese.',
    rating: 4.7,
    image: mexicanGreenWaveImg,
  },
];

export default pizzaData;
