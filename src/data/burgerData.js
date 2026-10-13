import vegClassicBurgerImg from '../assets/images/veg-classic-burger.jpg';
import cheeseBurgerImg from '../assets/images/cheese-burger.jpg';
import paneerBurgerImg from '../assets/images/paneer-burger.jpg';
import cornCheeseBurgerImg from '../assets/images/corn-cheese-burger.jpg';
import crunchyBurgerImg from '../assets/images/crunchy-burger.jpg';

const burgerData = [
  {
    id: 1,
    name: 'Veg Classic Burger',
    price: '₹149',
    description: 'A crispy vegetable patty with lettuce, tomato, onion, and house sauce.',
    rating: 4.5,
    image: vegClassicBurgerImg,
  },
  {
    id: 2,
    name: 'Cheese Burger',
    price: '₹179',
    description: 'Loaded with melted cheese, crispy patty, and fresh vegetables.',
    rating: 4.6,
    image: cheeseBurgerImg,
  },
  {
    id: 3,
    name: 'Paneer Burger',
    price: '₹199',
    description: 'Grilled paneer tikka with spicy mayo and fresh lettuce.',
    rating: 4.8,
    image: paneerBurgerImg,
  },
  {
    id: 4,
    name: 'Corn Cheese Burger',
    price: '₹189',
    description: 'Corn and cheese patty served with creamy sauce.',
    rating: 4.4,
    image: cornCheeseBurgerImg,
  },
  {
    id: 5,
    name: 'Crunchy Burger',
    price: '₹209',
    description: 'Extra crispy vegetable patty with crunchy toppings.',
    rating: 4.7,
    image: crunchyBurgerImg,
  },
];

export default burgerData;
