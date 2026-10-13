import redVelvetCakeImg from '../assets/images/red-velvet-cake.jpg';
import chocolateBrownieImg from '../assets/images/chocolate-brownie.jpg';
import cheesecakeImg from '../assets/images/cheesecake.jpg';
import chocolateLavaCakeImg from '../assets/images/chocolate-lava-cake.jpg';
import tiramisuImg from '../assets/images/tiramisu.jpg';

const dessertData = [
  {
    id: 1,
    name: 'Red Velvet Cake',
    price: '₹229',
    description: 'Soft and velvety red cake layers with rich cream cheese frosting.',
    rating: 4.8,
    image: redVelvetCakeImg,
  },
  {
    id: 2,
    name: 'Chocolate Brownie',
    price: '₹199',
    description: 'Fudgy chocolate brownie loaded with chocolate chips and served warm.',
    rating: 4.7,
    image: chocolateBrownieImg,
  },
  {
    id: 3,
    name: 'Cheesecake',
    price: '₹249',
    description: 'Classic baked New York style cheesecake with a sweet graham cracker crust.',
    rating: 4.9,
    image: cheesecakeImg,
  },
  {
    id: 4,
    name: 'Chocolate Lava Cake',
    price: '₹219',
    description: 'Warm chocolate cake filled with a gooey liquid chocolate center.',
    rating: 4.8,
    image: chocolateLavaCakeImg,
  },
  {
    id: 5,
    name: 'Tiramisu',
    price: '₹279',
    description: 'Authentic Italian dessert made of coffee-dipped ladyfingers and sweet mascarpone.',
    rating: 4.9,
    image: tiramisuImg,
  },
];

export default dessertData;
