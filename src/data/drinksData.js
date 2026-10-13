import oreoShakeImg from '../assets/images/oreo-shake.jpg';
import chocolateShakeImg from '../assets/images/chocolate-shake.jpg';
import coldCoffeeImg from '../assets/images/cold-coffee.jpg';
import mangoShakeImg from '../assets/images/mango-shake.jpg';
import lemonadeImg from '../assets/images/lemonade.jpg';

const drinksData = [
  {
    id: 1,
    name: 'Oreo Shake',
    price: '₹199',
    description: 'Creamy thick shake blended with classic Oreo cookies and rich vanilla ice cream.',
    rating: 4.8,
    image: oreoShakeImg,
  },
  {
    id: 2,
    name: 'Chocolate Shake',
    price: '₹219',
    description: 'Decadent milkshake made with premium dark chocolate syrup and cocoa.',
    rating: 4.7,
    image: chocolateShakeImg,
  },
  {
    id: 3,
    name: 'Cold Coffee',
    price: '₹179',
    description: 'Classic brewed coffee blended with milk and sugar, served chilled.',
    rating: 4.6,
    image: coldCoffeeImg,
  },
  {
    id: 4,
    name: 'Mango Shake',
    price: '₹199',
    description: 'Fresh mango pulp blended with rich milk and topped with cherry.',
    rating: 4.5,
    image: mangoShakeImg,
  },
  {
    id: 5,
    name: 'Lemonade',
    price: '₹99',
    description: 'Freshly squeezed lemon juice with sugar and a hint of mint.',
    rating: 4.4,
    image: lemonadeImg,
  },
];

export default drinksData;
