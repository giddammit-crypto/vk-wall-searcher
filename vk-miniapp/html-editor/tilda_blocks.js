export const TILDA_CATEGORIES = [
  { id: 'cover', name: 'Cover', icon: 'image', count: 3 },
  { id: 'about', name: 'About', icon: 'info', count: 2 },
  { id: 'title', name: 'Title', icon: 'type', count: 2 },
  { id: 'text', name: 'Text', icon: 'align-left', count: 2 },
  { id: 'image', name: 'Image', icon: 'image', count: 2 },
  { id: 'gallery', name: 'Gallery', icon: 'grid', count: 2 },
  { id: 'form', name: 'Form & Button', icon: 'edit', count: 3 },
  { id: 'pricing', name: 'Pricing', icon: 'dollar-sign', count: 2 },
  { id: 'features', name: 'Features', icon: 'star', count: 3 },
  { id: 'testimonials', name: 'Testimonials', icon: 'message-square', count: 2 },
  { id: 'menu', name: 'Menu', icon: 'menu', count: 2 },
  { id: 'footer', name: 'Footer', icon: 'layout', count: 2 },
  { id: 'faq', name: 'FAQ', icon: 'help-circle', count: 2 },
  { id: 'media', name: 'Media', icon: 'video', count: 2 },
  { id: 'contacts', name: 'Contacts', icon: 'map-pin', count: 2 },
  { id: 'store', name: 'Store', icon: 'shopping-cart', count: 2 }
];

export const TILDA_BLOCKS = [
  // COVERS
  {
    id: 'cover-1', category: 'cover', name: 'Hero with Background Image',
    defaultContent: { title: 'Welcome to Our Website', subtitle: 'We build amazing products.', btnText: 'Get Started', bgImage: 'https://images.unsplash.com/photo-1506744269153-b29ec9f0888c?auto=format&fit=crop&w=1920&q=80' },
    defaultDesign: { overlayColor: 'rgba(0,0,0,0.5)', height: '100vh', titleSize: '4rem', textColor: '#ffffff' },
    html: (c, d) => `
      <div class="t-block t-cover" style="height: ${d.height}; background-image: url('${c.bgImage}'); background-size: cover; background-position: center; position: relative;">
        <div class="t-overlay" style="position: absolute; inset: 0; background-color: ${d.overlayColor};"></div>
        <div class="t-container" style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: ${d.textColor}; padding: 0 20px;">
          <h1 style="font-size: clamp(2rem, 5vw, ${d.titleSize}); margin-bottom: 20px; font-weight: bold;">${c.title}</h1>
          <p style="font-size: 1.2rem; margin-bottom: 30px; max-width: 600px;">${c.subtitle}</p>
          <button data-tilda-action="scroll" class="t-btn" style="padding: 15px 30px; font-size: 1rem; background: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer; transition: background 0.3s;">${c.btnText}</button>
        </div>
      </div>
    `
  },
  {
    id: 'cover-2', category: 'cover', name: 'Split Hero',
    defaultContent: { title: 'Innovative Solutions', text: 'Discover the power of modern technology.', img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80' },
    defaultDesign: { bgColor: '#f8f9fa', textColor: '#333' },
    html: (c, d) => `
      <div class="t-block t-cover-split" style="background: ${d.bgColor}; color: ${d.textColor}; min-height: 80vh; display: flex; flex-wrap: wrap;">
        <div style="flex: 1 1 300px; padding: 5vw; display: flex; flex-direction: column; justify-content: center;">
          <h1 style="font-size: clamp(2rem, 4vw, 3.5rem); margin-bottom: 1rem;">${c.title}</h1>
          <p style="font-size: 1.1rem; line-height: 1.6;">${c.text}</p>
        </div>
        <div style="flex: 1 1 300px; min-height: 300px; background-image: url('${c.img}'); background-size: cover; background-position: center;"></div>
      </div>
    `
  },
  {
    id: 'cover-3', category: 'cover', name: 'Minimal Hero',
    defaultContent: { title: 'Less is More', subtitle: 'Clean, simple, effective.' },
    defaultDesign: { bgColor: '#ffffff', textColor: '#111' },
    html: (c, d) => `
      <div class="t-block t-cover-min" style="background: ${d.bgColor}; color: ${d.textColor}; padding: 15vh 20px; text-align: center;">
        <h1 style="font-size: 3rem; margin-bottom: 1rem; font-weight: 300;">${c.title}</h1>
        <p style="font-size: 1.2rem; color: #666;">${c.subtitle}</p>
      </div>
    `
  },

  // ABOUT
  {
    id: 'about-1', category: 'about', name: 'About Us Simple',
    defaultContent: { title: 'About Us', text: 'We are a dedicated team of professionals.' },
    defaultDesign: { bgColor: '#ffffff', textColor: '#333' },
    html: (c, d) => `<div class="t-block" style="padding: 80px 20px; background: ${d.bgColor}; color: ${d.textColor}; text-align: center; max-width: 800px; margin: 0 auto;"><h2 style="font-size: 2.5rem; margin-bottom: 20px;">${c.title}</h2><p style="font-size: 1.1rem; line-height: 1.8;">${c.text}</p></div>`
  },
  {
    id: 'about-2', category: 'about', name: 'About with Image',
    defaultContent: { title: 'Our Story', text: 'Started from the bottom.', img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600' },
    defaultDesign: { bgColor: '#f0f0f0', textColor: '#222' },
    html: (c, d) => `<div class="t-block" style="padding: 60px 20px; background: ${d.bgColor}; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; align-items: center;"><img src="${c.img}" style="width: 100%; border-radius: 10px;"/><div style="color: ${d.textColor};"><h2>${c.title}</h2><p>${c.text}</p></div></div>`
  },

  // TITLE
  {
    id: 'title-1', category: 'title', name: 'Centered Title',
    defaultContent: { title: 'Section Title', subtitle: 'Optional subtitle here' },
    defaultDesign: { align: 'center', py: '60px', color: '#000' },
    html: (c, d) => `<div style="padding: ${d.py} 20px; text-align: ${d.align}; color: ${d.color};"><h2 style="font-size: 2.5rem; margin-bottom: 10px;">${c.title}</h2><p style="font-size: 1.2rem; opacity: 0.7;">${c.subtitle}</p></div>`
  },
  {
    id: 'title-2', category: 'title', name: 'Left Title with Divider',
    defaultContent: { title: 'Big Header' },
    defaultDesign: { py: '40px', color: '#333', dividerColor: '#007bff' },
    html: (c, d) => `<div style="padding: ${d.py} 20px; color: ${d.color}; max-width: 1200px; margin: 0 auto;"><h2 style="font-size: 2.5rem; position: relative; padding-bottom: 15px;">${c.title}<span style="position: absolute; bottom: 0; left: 0; width: 60px; height: 4px; background: ${d.dividerColor};"></span></h2></div>`
  },

  // TEXT
  {
    id: 'text-1', category: 'text', name: 'Standard Text Block',
    defaultContent: { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
    defaultDesign: { py: '40px', fontSize: '1.1rem', maxW: '800px', color: '#444' },
    html: (c, d) => `<div style="padding: ${d.py} 20px; max-width: ${d.maxW}; margin: 0 auto; font-size: ${d.fontSize}; color: ${d.color}; line-height: 1.8;">${c.text}</div>`
  },
  {
    id: 'text-2', category: 'text', name: 'Multi-column Text',
    defaultContent: { col1: 'Text column 1', col2: 'Text column 2' },
    defaultDesign: { py: '40px', color: '#333' },
    html: (c, d) => `<div style="padding: ${d.py} 20px; max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; color: ${d.color};"><div>${c.col1}</div><div>${c.col2}</div></div>`
  },

  // IMAGE
  {
    id: 'image-1', category: 'image', name: 'Full-width Image',
    defaultContent: { img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200' },
    defaultDesign: { py: '0px' },
    html: (c, d) => `<div style="padding: ${d.py} 0;"><img src="${c.img}" style="width: 100%; display: block; height: auto;" /></div>`
  },
  {
    id: 'image-2', category: 'image', name: 'Image with Caption',
    defaultContent: { img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800', caption: 'A beautiful workspace' },
    defaultDesign: { py: '40px', align: 'center' },
    html: (c, d) => `<div style="padding: ${d.py} 20px; text-align: ${d.align}; max-width: 800px; margin: 0 auto;"><img src="${c.img}" style="max-width: 100%; border-radius: 8px;" /><p style="margin-top: 10px; font-size: 0.9rem; color: #666;">${c.caption}</p></div>`
  },

  // GALLERY
  {
    id: 'gallery-1', category: 'gallery', name: 'Grid Gallery',
    defaultContent: { images: ['https://source.unsplash.com/random/400x300?sig=1', 'https://source.unsplash.com/random/400x300?sig=2', 'https://source.unsplash.com/random/400x300?sig=3'] },
    defaultDesign: { gap: '20px', cols: '3' },
    html: (c, d) => `<div style="padding: 40px 20px; max-width: 1200px; margin: 0 auto;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: ${d.gap};">${c.images.map(i => `<img src="${i}" style="width: 100%; border-radius: 8px; object-fit: cover; aspect-ratio: 4/3; cursor: pointer;" data-tilda-modal="image" />`).join('')}</div></div>`
  },
  {
    id: 'gallery-2', category: 'gallery', name: 'Slider Gallery',
    defaultContent: { images: ['https://source.unsplash.com/random/800x400?sig=1', 'https://source.unsplash.com/random/800x400?sig=2'] },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 40px 0; overflow: hidden;" data-tilda-slider="true"><div style="display: flex; gap: 10px; overflow-x: auto; padding: 0 20px; scroll-snap-type: x mandatory;">${c.images.map(i => `<img src="${i}" style="scroll-snap-align: center; flex: 0 0 80%; max-width: 800px; border-radius: 10px; object-fit: cover;" />`).join('')}</div></div>`
  },

  // FORM
  {
    id: 'form-1', category: 'form', name: 'Contact Form',
    defaultContent: { title: 'Contact Us', btnText: 'Send Message' },
    defaultDesign: { bgColor: '#f9f9f9' },
    html: (c, d) => `<div style="padding: 60px 20px; background: ${d.bgColor};"><form data-tilda-form="contact" style="max-width: 500px; margin: 0 auto; display: flex; flex-direction: column; gap: 15px;"><h3 style="text-align: center; margin-bottom: 20px;">${c.title}</h3><input type="text" placeholder="Name" style="padding: 12px; border: 1px solid #ccc; border-radius: 4px;" required /><input type="email" placeholder="Email" style="padding: 12px; border: 1px solid #ccc; border-radius: 4px;" required /><textarea placeholder="Message" rows="4" style="padding: 12px; border: 1px solid #ccc; border-radius: 4px;" required></textarea><button type="submit" style="padding: 15px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">${c.btnText}</button></form></div>`
  },
  {
    id: 'form-2', category: 'form', name: 'Newsletter Subscribe',
    defaultContent: { title: 'Subscribe to our newsletter', btnText: 'Subscribe' },
    defaultDesign: { bgColor: '#007bff', textColor: '#fff' },
    html: (c, d) => `<div style="padding: 60px 20px; background: ${d.bgColor}; color: ${d.textColor}; text-align: center;"><h3 style="margin-bottom: 20px;">${c.title}</h3><form data-tilda-form="subscribe" style="display: flex; justify-content: center; gap: 10px; max-width: 400px; margin: 0 auto;"><input type="email" placeholder="Enter your email" style="padding: 12px; border: none; border-radius: 4px; flex: 1;" required /><button type="submit" style="padding: 12px 20px; background: #222; color: #fff; border: none; border-radius: 4px;">${c.btnText}</button></form></div>`
  },
  {
    id: 'form-3', category: 'form', name: 'Call to Action Button',
    defaultContent: { text: 'Ready to dive in?', btnText: 'Start Now' },
    defaultDesign: { align: 'center', py: '50px' },
    html: (c, d) => `<div style="padding: ${d.py} 20px; text-align: ${d.align};"><h2>${c.text}</h2><button style="margin-top: 20px; padding: 15px 40px; font-size: 1.2rem; background: #28a745; color: white; border: none; border-radius: 30px; cursor: pointer;">${c.btnText}</button></div>`
  },

  // PRICING
  {
    id: 'pricing-1', category: 'pricing', name: '3-Tier Pricing',
    defaultContent: { plans: [{ name: 'Basic', price: '$10/mo', feats: ['Feature 1', 'Feature 2'] }, { name: 'Pro', price: '$20/mo', feats: ['All Basic', 'Feature 3'] }, { name: 'Max', price: '$30/mo', feats: ['All Pro', 'Feature 4'] }] },
    defaultDesign: { cardBg: '#fff' },
    html: (c, d) => `<div style="padding: 60px 20px; background: #f4f5f7;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; max-width: 1000px; margin: 0 auto;">${c.plans.map(p => `<div style="background: ${d.cardBg}; padding: 40px 20px; text-align: center; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"><h3>${p.name}</h3><div style="font-size: 2rem; font-weight: bold; margin: 20px 0;">${p.price}</div><ul style="list-style: none; padding: 0; margin-bottom: 30px; color: #666;">${p.feats.map(f => `<li style="margin-bottom: 10px;">${f}</li>`).join('')}</ul><button style="padding: 10px 20px; border-radius: 5px; border: 1px solid #000; background: transparent; cursor: pointer;">Select Plan</button></div>`).join('')}</div></div>`
  },
  {
    id: 'pricing-2', category: 'pricing', name: 'Simple Pricing',
    defaultContent: { title: 'One Simple Price', price: '$99', desc: 'Lifetime access.' },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 80px 20px; text-align: center;"><h2>${c.title}</h2><p style="font-size: 4rem; font-weight: 800; margin: 20px 0;">${c.price}</p><p style="color: #666;">${c.desc}</p><button style="margin-top: 20px; padding: 15px 40px; background: #000; color: #fff; border: none; border-radius: 5px;">Buy Now</button></div>`
  },

  // FEATURES
  {
    id: 'features-1', category: 'features', name: 'Grid Features',
    defaultContent: { items: [{ title: 'Fast', desc: 'Lightning speed.' }, { title: 'Secure', desc: 'Encrypted data.' }, { title: 'Reliable', desc: '99.9% uptime.' }] },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 60px 20px; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px;">${c.items.map(i => `<div><h4 style="font-size: 1.2rem; margin-bottom: 10px;">${i.title}</h4><p style="color: #666;">${i.desc}</p></div>`).join('')}</div>`
  },
  {
    id: 'features-2', category: 'features', name: 'Feature Left Image Right',
    defaultContent: { title: 'Awesome Feature', desc: 'It does everything you need.', img: 'https://source.unsplash.com/random/500x500?sig=4' },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 60px 20px; max-width: 1000px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 40px;"><div style="flex: 1 1 300px;"><h2>${c.title}</h2><p style="margin-top: 20px; color: #555; line-height: 1.6;">${c.desc}</p></div><div style="flex: 1 1 300px;"><img src="${c.img}" style="width: 100%; border-radius: 10px;" /></div></div>`
  },
  {
    id: 'features-3', category: 'features', name: 'Icons Row',
    defaultContent: { features: ['Responsive', 'Modern', 'Fast'] },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 50px 20px; background: #111; color: #fff; display: flex; justify-content: center; gap: 50px; flex-wrap: wrap; text-align: center;">${c.features.map(f => `<div><div style="width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 50%; margin: 0 auto 10px;"></div><b>${f}</b></div>`).join('')}</div>`
  },

  // TESTIMONIALS
  {
    id: 'testimonials-1', category: 'testimonials', name: 'Testimonial Cards',
    defaultContent: { reviews: [{ text: '"Amazing product!"', author: 'John Doe' }, { text: '"Saved me hours."', author: 'Jane Smith' }] },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 60px 20px; background: #f9f9f9;"><div style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">${c.reviews.map(r => `<div style="background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);"><p style="font-style: italic; margin-bottom: 20px; color: #444;">${r.text}</p><strong>- ${r.author}</strong></div>`).join('')}</div></div>`
  },
  {
    id: 'testimonials-2', category: 'testimonials', name: 'Big Testimonial',
    defaultContent: { quote: '"The best decision we ever made."', author: 'CEO, Acme Corp' },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 80px 20px; text-align: center; max-width: 800px; margin: 0 auto;"><h2 style="font-size: 2.5rem; font-weight: 300; line-height: 1.4; margin-bottom: 20px;">${c.quote}</h2><p style="text-transform: uppercase; letter-spacing: 1px; color: #888;">${c.author}</p></div>`
  },

  // MENU
  {
    id: 'menu-1', category: 'menu', name: 'Standard Top Menu',
    defaultContent: { logo: 'Logo', links: ['Home', 'About', 'Services', 'Contact'] },
    defaultDesign: { bgColor: '#ffffff', textColor: '#000' },
    html: (c, d) => `<nav style="background: ${d.bgColor}; color: ${d.textColor}; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><div style="font-weight: bold; font-size: 1.5rem;">${c.logo}</div><ul style="list-style: none; display: flex; gap: 20px; margin: 0; padding: 0;">${c.links.map(l => `<li><a href="#" style="text-decoration: none; color: inherit;">${l}</a></li>`).join('')}</ul></nav>`
  },
  {
    id: 'menu-2', category: 'menu', name: 'Burger Menu',
    defaultContent: { logo: 'Brand' },
    defaultDesign: { bgColor: '#111', textColor: '#fff' },
    html: (c, d) => `<nav style="background: ${d.bgColor}; color: ${d.textColor}; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;"><div style="font-size: 1.2rem; font-weight: bold;">${c.logo}</div><button data-tilda-burger="toggle" style="background: transparent; border: none; color: inherit; cursor: pointer; font-size: 1.5rem;">☰</button></nav>`
  },

  // FOOTER
  {
    id: 'footer-1', category: 'footer', name: 'Simple Footer',
    defaultContent: { text: '© 2024 Company Name. All rights reserved.' },
    defaultDesign: { bgColor: '#222', textColor: '#ccc' },
    html: (c, d) => `<footer style="background: ${d.bgColor}; color: ${d.textColor}; text-align: center; padding: 30px 20px; font-size: 0.9rem;">${c.text}</footer>`
  },
  {
    id: 'footer-2', category: 'footer', name: 'Multi-column Footer',
    defaultContent: { col1: 'Company', col2: 'Legal', col3: 'Social' },
    defaultDesign: { bgColor: '#f8f9fa', textColor: '#333' },
    html: (c, d) => `<footer style="background: ${d.bgColor}; color: ${d.textColor}; padding: 60px 20px;"><div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 30px;"><div><strong>${c.col1}</strong><ul style="list-style:none; padding:0; margin-top:15px; line-height:2;"><li>About</li><li>Jobs</li></ul></div><div><strong>${c.col2}</strong><ul style="list-style:none; padding:0; margin-top:15px; line-height:2;"><li>Terms</li><li>Privacy</li></ul></div><div><strong>${c.col3}</strong><ul style="list-style:none; padding:0; margin-top:15px; line-height:2;"><li>Twitter</li><li>Facebook</li></ul></div></div></footer>`
  },

  // FAQ
  {
    id: 'faq-1', category: 'faq', name: 'Accordion FAQ',
    defaultContent: { items: [{ q: 'How does it work?', a: 'Very simply.' }, { q: 'Is it free?', a: 'Yes, for basic usage.' }] },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 60px 20px; max-width: 800px; margin: 0 auto;"><h2 style="text-align: center; margin-bottom: 40px;">FAQ</h2><div style="display: flex; flex-direction: column; gap: 15px;">${c.items.map(i => `<details data-tilda-accordion style="background: #f4f5f7; padding: 15px; border-radius: 5px; cursor: pointer;"><summary style="font-weight: bold; outline: none;">${i.q}</summary><div style="margin-top: 10px; color: #555;">${i.a}</div></details>`).join('')}</div></div>`
  },
  {
    id: 'faq-2', category: 'faq', name: 'Grid FAQ',
    defaultContent: { items: [{ q: 'Question 1', a: 'Answer 1' }, { q: 'Question 2', a: 'Answer 2' }, { q: 'Question 3', a: 'Answer 3' }, { q: 'Question 4', a: 'Answer 4' }] },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 60px 20px; max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">${c.items.map(i => `<div><h4 style="margin-bottom: 10px;">${i.q}</h4><p style="color: #666;">${i.a}</p></div>`).join('')}</div>`
  },

  // MEDIA
  {
    id: 'media-1', category: 'media', name: 'YouTube Video',
    defaultContent: { videoId: 'dQw4w9WgXcQ' },
    defaultDesign: { py: '40px' },
    html: (c, d) => `<div style="padding: ${d.py} 20px; max-width: 800px; margin: 0 auto;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 10px;"><iframe src="https://www.youtube.com/embed/${c.videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe></div></div>`
  },
  {
    id: 'media-2', category: 'media', name: 'Audio Player',
    defaultContent: { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', title: 'Sample Track' },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 40px 20px; text-align: center; background: #f0f0f0; border-radius: 8px; max-width: 500px; margin: 0 auto;"><h3>${c.title}</h3><audio controls style="width: 100%; margin-top: 15px;"><source src="${c.src}" type="audio/mpeg">Your browser does not support audio.</audio></div>`
  },

  // CONTACTS
  {
    id: 'contacts-1', category: 'contacts', name: 'Map & Address',
    defaultContent: { address: '123 Main St, NY, USA', email: 'hello@example.com', phone: '+1 555 0000' },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 60px 20px; max-width: 1000px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 40px;"><div style="flex: 1 1 300px;"><h2>Get in touch</h2><p style="margin-top:20px;"><strong>Address:</strong> ${c.address}</p><p><strong>Email:</strong> ${c.email}</p><p><strong>Phone:</strong> ${c.phone}</p></div><div style="flex: 1 1 400px; background: #ddd; min-height: 300px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #888;">[ Map Placeholder ]</div></div>`
  },
  {
    id: 'contacts-2', category: 'contacts', name: 'Simple Contact Info',
    defaultContent: { text: 'Reach out anytime at contact@site.com' },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 50px 20px; text-align: center; font-size: 1.5rem;">${c.text}</div>`
  },

  // STORE
  {
    id: 'store-1', category: 'store', name: 'Product Grid',
    defaultContent: { products: [{ name: 'Item A', price: '$10', img: 'https://source.unsplash.com/random/200x200?sig=10' }, { name: 'Item B', price: '$20', img: 'https://source.unsplash.com/random/200x200?sig=11' }] },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 60px 20px; max-width: 1200px; margin: 0 auto;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 30px;">${c.products.map(p => `<div style="text-align: center;"><img src="${p.img}" style="width: 100%; border-radius: 8px;" /><h4 style="margin: 15px 0 5px;">${p.name}</h4><p style="color: #666; margin-bottom: 15px;">${p.price}</p><button data-tilda-cart-add="true" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Add to Cart</button></div>`).join('')}</div></div>`
  },
  {
    id: 'store-2', category: 'store', name: 'Single Product Featured',
    defaultContent: { name: 'Super Widget', price: '$99', desc: 'The best widget ever.', img: 'https://source.unsplash.com/random/500x500?sig=12' },
    defaultDesign: {},
    html: (c, d) => `<div style="padding: 60px 20px; max-width: 1000px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 40px; align-items: center;"><div style="flex: 1 1 300px;"><img src="${c.img}" style="width: 100%; border-radius: 10px;" /></div><div style="flex: 1 1 300px;"><h2>${c.name}</h2><p style="font-size: 2rem; color: #28a745; margin: 15px 0;">${c.price}</p><p style="margin-bottom: 25px; color: #555; line-height: 1.6;">${c.desc}</p><button data-tilda-cart-add="true" style="padding: 15px 40px; background: #007bff; color: #fff; border: none; border-radius: 5px; font-size: 1.1rem; cursor: pointer;">Buy Now</button></div></div>`
  }
];

export function getBlockById(id) {
  return TILDA_BLOCKS.find(b => b.id === id);
}

export function getBlocksByCategory(catId) {
  return TILDA_BLOCKS.filter(b => b.category === catId);
}

export function renderBlockHtml(block, contentData, designData) {
  const mergedContent = { ...block.defaultContent, ...contentData };
  const mergedDesign = { ...block.defaultDesign, ...designData };
  return block.html(mergedContent, mergedDesign);
}

export function extractBlockDefaultData(block) {
  return {
    content: { ...block.defaultContent },
    design: { ...block.defaultDesign }
  };
}
