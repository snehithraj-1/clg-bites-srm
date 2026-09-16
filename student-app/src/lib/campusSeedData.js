// Authentic Menus for Srm : College Bites: Local Home Kitchen & Clg Bites Biryani Nation

export const DEFAULT_RESTAURANTS = [
  {
    id: "local-home-kitchen",
    name: "Local Home Kitchen",
    description: "Trust it, Taste it — Fast Food & Biryani's. Beside Ayyappa PG Hostel, Neerukonda.",
    cuisine: "Fast Food & Biryani's",
    location: "Beside Ayyappa PG Hostel - Neerukonda",
    phone: "9989955833",
    rating: 4.8,
    prep_time: "15-20 min",
    image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80",
    is_open: true
  },
  {
    id: "clg-bites-biryani-nation",
    name: "Biryani Nation",
    description: "A Taste You'll Love... Fresh, Delicious Biryanis with Special Campus Discounts!",
    cuisine: "Chicken & Veg Biryanis",
    location: "Neerukonda Campus Hub, SRM University AP",
    phone: "9989955833",
    rating: 4.9,
    prep_time: "15-25 min",
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80",
    is_open: true
  }
];

export const DEFAULT_MENU_ITEMS = [
  // =========================================================================
  // 1. CLG BITES BIRYANI NATION (Biryani Special Menu with Single & Full sizes)
  // =========================================================================

  // Chicken Biryani
  {
    id: "cbn-chk-dum-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Dum Biryani (Single)",
    description: "Authentic slow-cooked dum biryani with marinated tender chicken and fragrant basmati rice.",
    price: 190,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-dum-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Dum Biryani (Full)",
    description: "Full portion aromatic Hyderabadi dum biryani with juicy chicken pieces, boiled egg & mirchi ka salan.",
    price: 260,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-fry-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Fry Biryani (Single)",
    description: "Crispy Andhra spiced chicken fry served generously over flavorful dum biryani rice.",
    price: 200,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-fry-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Fry Biryani (Full)",
    description: "Large serving of spicy roasted chicken fry pieces over seasoned ghee biryani rice.",
    price: 270,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-bone-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Boneless Biryani (Single)",
    description: "Tender, succulent boneless chicken cubes tossed in rich spices layered with fragrant biryani.",
    price: 210,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-bone-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Boneless Biryani (Full)",
    description: "Full generous portion of boneless chicken bites with spicy caramelized onion biryani rice.",
    price: 290,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-lol-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Lollipop Biryani (Single)",
    description: "Crisp seasoned chicken lollipops paired with hot dum biryani rice and raita.",
    price: 210,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-lol-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Lollipop Biryani (Full)",
    description: "Family size aromatic biryani crowned with multiple spicy chicken lollipops.",
    price: 290,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-mogh-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Moghalai Biryani (Single)",
    description: "Royal Mughlai style biryani cooked with rich egg gravy, cashew nut paste and tender chicken.",
    price: 220,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1642821373181-696a54913e9a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-mogh-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken Moghalai Biryani (Full)",
    description: "Rich Mughlai chicken biryani infused with saffron, egg shreds and creamy gravy.",
    price: 300,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1642821373181-696a54913e9a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-65-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken 65 Biryani (Single)",
    description: "Spicy curry-leaf tempered Chicken 65 tossed over flavorful biryani rice.",
    price: 210,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-65-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Chicken 65 Biryani (Full)",
    description: "Large serving of spicy South Indian Chicken 65 combined with fragrant basmati biryani.",
    price: 290,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-mix-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "All Mix Chicken Biryani (Single)",
    description: "Chef special combination of Dum, Fry, and 65 chicken pieces in one grand biryani.",
    price: 210,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-chk-mix-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "All Mix Chicken Biryani (Full)",
    description: "The ultimate chicken lover feast with assorted boneless, fry and dum cuts in rich biryani rice.",
    price: 280,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-egg-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Egg Biryani (Single)",
    description: "Golden spiced boiled eggs served with aromatic basmati dum biryani rice & raita.",
    price: 170,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1599043513903-ecac48078953?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-egg-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Chicken Biryani",
    name: "Egg Biryani (Full)",
    description: "Double boiled eggs roasted in Andhra masala served over full pot dum biryani rice.",
    price: 230,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1599043513903-ecac48078953?auto=format&fit=crop&w=600&q=80"
  },

  // Veg Biryani
  {
    id: "cbn-veg-dum-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Veg Biryani",
    name: "Veg Dum Biryani (Single)",
    description: "Fresh garden vegetables, potatoes, beans & carrots layered in saffron dum basmati rice.",
    price: 150,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-veg-dum-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Veg Biryani",
    name: "Veg Dum Biryani (Full)",
    description: "Family portion wholesome vegetable dum biryani served with creamy vegetable raita.",
    price: 220,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-pan-bir-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Veg Biryani",
    name: "Paneer Biryani (Single)",
    description: "Soft fresh malai paneer cubes marinated in yogurt and spices layered with aromatic biryani.",
    price: 210,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-pan-bir-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Veg Biryani",
    name: "Paneer Biryani (Full)",
    description: "Double paneer cubes simmered in biryani spices and layered with fragrant ghee rice.",
    price: 290,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-kaju-bir-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Veg Biryani",
    name: "Cashew Biryani (Single)",
    description: "Roasted golden whole cashews (kaju) tossed in ghee masala and dum basmati rice.",
    price: 220,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-kaju-bir-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Veg Biryani",
    name: "Cashew Biryani (Full)",
    description: "Royal treat loaded with crunchy roasted cashews cooked in rich Hyderabadi biryani spices.",
    price: 300,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-kaju-pan-s",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Veg Biryani",
    name: "Cashew & Paneer Mixed Biryani (Single)",
    description: "Delicious combination of roasted whole cashews and tender fresh paneer in spicy biryani.",
    price: 240,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-kaju-pan-f",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Veg Biryani",
    name: "Cashew & Paneer Mixed Biryani (Full)",
    description: "Deluxe vegetarian feast loaded with premium kaju nuts and melt-in-mouth paneer cubes.",
    price: 300,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80"
  },

  // =========================================================================
  // 2. LOCAL HOME KITCHEN (Fast Food & Biryani's — Complete Authentic Menu)
  // =========================================================================

  // Biryani's
  {
    id: "lhk-bir-chk-dum",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Chicken Dum Biryani",
    description: "Authentic Neerukonda homestyle chicken dum biryani cooked in sealed handi.",
    price: 170,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-bir-chk-fry",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Chicken Fry Biryani",
    description: "Spicy crisp Andhra fried chicken placed over long grain flavored biryani rice.",
    price: 190,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-bir-chk-bone",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Chicken Boneless Biryani",
    description: "Juicy boneless chicken pieces sauteed in thick gravy layered with hot dum rice.",
    price: 240,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-bir-chk-65",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Chicken 65 Biryani",
    description: "Special spicy Chicken 65 pieces served atop aromatic masala biryani.",
    price: 250,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-bir-chk-lol",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Chicken Lollipop Biryani",
    description: "Golden fried chicken drumettes tossed in spices over fragrant biryani rice.",
    price: 250,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-bir-chk-maju",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Chicken Majubai Biryani",
    description: "Signature kitchen special chicken recipe with rich aromatic secret masala.",
    price: 250,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-bir-mush",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Mushroom Biryani",
    description: "Button mushrooms sauteed in ground spices and layered in basmati rice.",
    price: 220,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-bir-kaju-mush",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Kaju Mushroom Biryani",
    description: "Crunchy cashews and fresh mushrooms tossed together in rich fragrant biryani.",
    price: 250,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-bir-pan",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Paneer Biryani",
    description: "Diced tender paneer tossed in roasted masala with long-grain basmati.",
    price: 220,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-bir-kaju-pan",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Biryani's",
    name: "Kaju Paneer Biryani",
    description: "Whole roasted cashews and cottage cheese cubes in spiced ghee biryani.",
    price: 260,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80"
  },

  // Starters - Veg
  {
    id: "lhk-stv-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Veg",
    name: "Veg Manchurian",
    description: "Crisp fried vegetable balls tossed in wok-style ginger, garlic & soy glaze.",
    price: 80,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stv-pan-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Veg",
    name: "Paneer Manchuria",
    description: "Crispy paneer cubes tossed in zesty Indo-Chinese Manchurian sauce.",
    price: 180,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stv-pan-maj",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Veg",
    name: "Paneer Majestic",
    description: "Stir fried paneer strips in spicy yogurt-mint sauce with curry leaves & green chillies.",
    price: 200,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stv-kaju-pan-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Veg",
    name: "Kaju Paneer Manchuria",
    description: "Golden roasted cashews and paneer tossed together in spicy Manchurian gravy.",
    price: 210,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stv-mush-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Veg",
    name: "Mushroom Manchuria",
    description: "Crisp battered button mushrooms glazed in tangy chili-garlic Manchurian sauce.",
    price: 180,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stv-kaju-mush-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Veg",
    name: "Kaju Mushroom Manchuria",
    description: "Wholesome cashews and juicy mushrooms stir-fried in rich Indo-Chinese spices.",
    price: 210,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=600&q=80"
  },

  // Starters - Chicken
  {
    id: "lhk-stc-chk-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "Chicken Manchuria",
    description: "Boneless chicken pieces tossed with bell peppers, spring onions & soy glaze.",
    price: 180,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stc-chk-65",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "Chicken 65",
    description: "Classic deep-fried marinated chicken bites with curry leaves, yogurt and red chillies.",
    price: 200,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stc-chilli-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "Chilli Chicken",
    description: "Spicy battered chicken wok-tossed with green chillies, garlic and capsicum.",
    price: 200,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stc-kaju-chk-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "Chicken Kaju Manchuria",
    description: "Tender chicken and crunchy cashew nuts tossed in flavorful Manchurian sauce.",
    price: 210,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stc-chk-maj",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "Chicken Majestic",
    description: "Hyderabadi spiced chicken strips stir-fried with curd, mint, and crushed spices.",
    price: 220,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stc-kaju-chilli-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "Kaju Chilli Chicken",
    description: "Whole roasted kaju nuts and spicy chilli chicken bites tossed in hot wok.",
    price: 230,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stc-pep-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "Pepper Chicken",
    description: "Freshly ground black pepper chicken dry roast with curry leaves and onions.",
    price: 230,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stc-lem-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "Lemon Chicken",
    description: "Tangy and zesty chicken morsels with fresh lemon reduction and herbs.",
    price: 230,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stc-chk-lol",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "Chicken Lollipop (6pcs)",
    description: "6 pieces of succulent chicken lollipops fried golden and served with spicy schezwan dip.",
    price: 250,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-stc-kfc-chk-lol",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Starters - Chicken",
    name: "KFC Chicken Lollipop",
    description: "Extra crunchy American crust coated chicken drumettes with secret spice blend.",
    price: 300,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80"
  },

  // Fried Rice
  {
    id: "lhk-fr-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Chicken Fried Rice",
    description: "Classic wok-tossed basmati rice with seasoned chicken bits and scrambled egg.",
    price: 120,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-fr-chk-w",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Chicken Fried Rice (white)",
    description: "Non-spicy white pepper chicken fried rice stir-fried with scallions.",
    price: 130,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-fr-db-egg-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Double Egg Chicken Fried Rice",
    description: "Loaded with double eggs and juicy chicken pieces stir-fried at high heat.",
    price: 130,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-fr-kaju-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Kaju Chicken Fried Rice",
    description: "Premium fried rice with generous roasted cashews and shredded chicken.",
    price: 160,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-fr-veg",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Veg Fried Rice",
    description: "Stir-fried rice with fine chopped carrots, beans, cabbage and spring onions.",
    price: 80,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-fr-veg-w",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Veg Fried Rice (white)",
    description: "Mild aromatic white stir-fried rice with fresh diced vegetables.",
    price: 90,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-fr-db-egg",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Double Egg Fried Rice",
    description: "Rich scrambled double egg fried rice with freshly ground black pepper.",
    price: 110,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-fr-veg-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Veg Manchurian Rice",
    description: "Wok tossed fried rice combined with crunchy vegetable Manchurian balls.",
    price: 110,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-fr-db-egg-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Double Egg Manchuria Rice",
    description: "Double egg stir-fried rice topped with savory Manchurian gravy and bites.",
    price: 120,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-fr-veg-manch-w",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Fried Rice",
    name: "Veg Manchuria Rice (white)",
    description: "White pepper fried rice served with delicate vegetable Manchurian.",
    price: 120,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },

  // Noodles
  {
    id: "lhk-nd-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Chicken Noodles",
    description: "Wok tossed Hakka noodles with chicken slices, egg and crunchy vegetables.",
    price: 120,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-chk-w",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Chicken Noodles (white)",
    description: "Mild garlic white noodles tossed with tender chicken shreds.",
    price: 130,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-db-egg-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Double Egg Chicken Noodles",
    description: "Double egg scrambled into piping hot chicken noodles with chili oil.",
    price: 130,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-kaju-chk",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Kaju Chicken Noodles",
    description: "Special noodles stir-fried with roasted cashews and juicy chicken.",
    price: 160,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-veg",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Veg Noodles",
    description: "Street-style Hakka noodles stir-fried with julienned vegetables.",
    price: 80,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-veg-w",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Veg Noodles (white)",
    description: "Delicate white butter garlic noodles with fresh seasonal veggies.",
    price: 90,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-egg-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Egg Manchurian Noodles",
    description: "Egg tossed noodles served with flavorful Manchurian sauce.",
    price: 120,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-db-egg-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Double Egg Manchurian Noodles",
    description: "Hearty double egg noodles with rich Manchurian dumplings & gravy.",
    price: 120,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-veg-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Veg Manchurian Noodles",
    description: "Vegetable noodles combined with golden crispy veg Manchurian.",
    price: 110,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-kaju",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Kaju Noodles",
    description: "Vegetarian noodles loaded with roasted crunchy whole cashews.",
    price: 120,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-nd-kaju-manch",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Noodles",
    name: "Kaju Manchuria Noodles",
    description: "Delicious combo of roasted cashews, Manchurian balls and noodles.",
    price: 140,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },

  // Paneer & Mushroom Items
  {
    id: "lhk-pm-pan-fr",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Paneer & Mushroom",
    name: "Paneer Fried Rice",
    description: "Fried rice tossed with marinated soft paneer cubes & spices.",
    price: 150,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-pm-pan-nd",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Paneer & Mushroom",
    name: "Paneer Noodles",
    description: "Wok-fried noodles with generous cubes of fresh paneer.",
    price: 150,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-pm-mush-fr",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Paneer & Mushroom",
    name: "Mushroom Fried Rice",
    description: "Fresh button mushrooms stir-fried with fragrant basmati rice.",
    price: 150,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-pm-mush-nd",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Paneer & Mushroom",
    name: "Mushroom Noodles",
    description: "Savory sliced mushrooms wok-tossed with Hakka noodles.",
    price: 150,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },

  // Schezwan Items
  {
    id: "lhk-scz-veg-fr",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Schezwan Specials",
    name: "Veg Schezwan Fried Rice",
    description: "Fiery red Schezwan chili paste wok-fried with vegetables and rice.",
    price: 120,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-scz-egg-fr",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Schezwan Specials",
    name: "Egg Schezwan Fried Rice",
    description: "Spicy Schezwan fried rice with scrambled egg and spring onions.",
    price: 140,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-scz-manch-fr",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Schezwan Specials",
    name: "Manchurian Schezwan Fried Rice",
    description: "Tangy spicy Schezwan rice with crispy Manchurian bites.",
    price: 160,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-scz-chk-fr",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Schezwan Specials",
    name: "Schezwan Chicken Fried Rice",
    description: "Tender chicken shreds tossed in hot red Schezwan sauce with basmati.",
    price: 170,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-scz-veg-nd",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Schezwan Specials",
    name: "Veg Schezwan Noodles",
    description: "Zesty spicy noodles with stir-fried cabbage, carrots and peppers.",
    price: 120,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-scz-egg-nd",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Schezwan Specials",
    name: "Egg Schezwan Noodles",
    description: "Scrambled egg noodles tossed in bold Schezwan sauce.",
    price: 140,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-scz-manch-nd",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Schezwan Specials",
    name: "Manchurian Schezwan Noodles",
    description: "Crispy Manchurian balls stirred into spicy Schezwan noodles.",
    price: 160,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-scz-chk-nd",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Schezwan Specials",
    name: "Schezwan Chicken Noodles",
    description: "Hot Schezwan chili noodles loaded with spicy chicken chunks.",
    price: 170,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80"
  },

  // SP Special Items
  {
    id: "lhk-sp-chk-fr",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "SP Items (Special)",
    name: "SP Chicken Fried Rice",
    description: "Chef's special double-spiced chicken fried rice with secret campus blend.",
    price: 140,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-sp-chk-nd",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "SP Items (Special)",
    name: "SP Chicken Noodles",
    description: "Special recipe wok noodles loaded with extra chicken and spices.",
    price: 140,
    is_veg: false,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-sp-pan-fr",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "SP Items (Special)",
    name: "SP Paneer Fried Rice",
    description: "Special paneer fried rice with roasted dry spices and extra paneer.",
    price: 180,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-sp-pan-nd",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "SP Items (Special)",
    name: "SP Paneer Noodles",
    description: "Special paneer noodles tossed with butter, chillies and spring greens.",
    price: 180,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-sp-mush-fr",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "SP Items (Special)",
    name: "SP Mushroom Fried Rice",
    description: "Special butter-sauteed mushroom fried rice with crackled black pepper.",
    price: 180,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "lhk-sp-mush-nd",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "SP Items (Special)",
    name: "SP Mushroom Noodles",
    description: "Special Hakka noodles packed with flavorful mushrooms & spices.",
    price: 180,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"
  },

  // Extras
  {
    id: "lhk-ext-drinks",
    restaurant_id: "local-home-kitchen",
    restaurant_name: "Local Home Kitchen",
    category: "Extras",
    name: "Soft Drinks (Chilled Can / Bottle)",
    description: "Refreshing cold drink (Thums Up, Coca Cola, Sprite, or Fanta).",
    price: 40,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cbn-ext-drinks",
    restaurant_id: "clg-bites-biryani-nation",
    restaurant_name: "Biryani Nation",
    category: "Extras",
    name: "Soft Drinks (Chilled Can / Bottle)",
    description: "Ice-cold refreshing soft drink to pair with your hot biryani.",
    price: 40,
    is_veg: true,
    image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80"
  }
];
