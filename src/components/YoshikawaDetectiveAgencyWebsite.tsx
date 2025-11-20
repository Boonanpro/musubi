import React, { useState } from 'react';

const YoshikawaDetectiveAgencyWebsite: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <div style={{padding: '20px'}}>
            <h1>Welcome to Yoshikawa Detective Agency</h1>
            <p>We are a detective agency based in Yonago City, Tottori Prefecture, dedicated to providing top-notch investigative services to our clients.</p>
          </div>
        );
      case 'about':
        return (
          <div style={{padding: '20px'}}>
            <h2>About Us</h2>
            <p>Yoshikawa Detective Agency was founded in 1995 by experienced detective Takeshi Yoshikawa. With a team of skilled investigators, we have been serving the local community and beyond for over 25 years.</p>
            <p>Our mission is to deliver reliable, discreet, and efficient investigative solutions to help our clients uncover the truth and resolve their concerns.</p>
          </div>
        );
      case 'services':
        return (
          <div style={{padding: '20px'}}>
            <h2>Our Services</h2>
            <ul>
              <li>Surveillance and monitoring</li>
              <li>Background checks and due diligence</li>
              <li>Missing persons investigations</li>
              <li>Infidelity and cheating spouse investigations</li>
              <li>Corporate investigations and asset searches</li>
              <li>Skip tracing and locating individuals</li>
            </ul>
          </div>
        );
      case 'pricing':
        return (
          <div style={{padding: '20px'}}>
            <h2>Pricing</h2>
            <p>Our pricing is competitive and tailored to the specific needs of each case. We offer flexible pricing options:</p>
            <ul>
              <li>Hourly rates starting from ¥10,000</li>
              <li>Daily rates starting from ¥80,000</li>
              <li>Custom package deals based on the scope of the investigation</li>
            </ul>
            <p>Please contact us for a free consultation and detailed pricing information.</p>
          </div>
        );
      case 'contact':
        return (
          <div style={{padding: '20px'}}>
            <h2>Contact Us</h2>
            <p>Phone: 0859-XX-XXXX</p>
            <p>Email: info@yoshikawa-detective.com</p>
            <p>Address: 123 Main Street, Yonago City, Tottori Prefecture, Japan</p>
            <form onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name">Name:</label>
                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                {nameError && <p style={{color: 'red'}}>{nameError}</p>}
              </div>
              <div>
                <label htmlFor="email">Email:</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                {emailError && <p style={{color: 'red'}}>{emailError}</p>}
              </div>
              <div>
                <label htmlFor="message">Message:</label>
                <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required></textarea>
                {messageError && <p style={{color: 'red'}}>{messageError}</p>}
              </div>
              <button type="submit">Submit</button>
            </form>
            {submitSuccess && <p style={{color: 'green'}}>Thank you for your message. We will get back to you soon!</p>}
          </div>
        );
      default:
        return null;
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let isValid = true;

    if (name.trim() === '') {
      setNameError('Name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    if (email.trim() === '') {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (message.trim() === '') {
      setMessageError('Message is required');
      isValid = false;
    } else {
      setMessageError('');
    }

    if (isValid) {
      // Simulating form submission
      console.log('Form submitted:', { name, email, message });
      setName('');
      setEmail('');
      setMessage('');
      setSubmitSuccess(true);
    }
  };

  return (
    <div style={{fontFamily: 'Arial, sans-serif'}}>
      <header style={{background: '#333', color: 'white', padding: '20px'}}>
        <h1 style={{margin: 0}}>Yoshikawa Detective Agency</h1>
      </header>
      <nav style={{background: '#f4f4f4', padding: '10px'}}>
        <button onClick={() => setCurrentPage('home')}>Home</button>
        <button onClick={() => setCurrentPage('about')}>About</button>
        <button onClick={() => setCurrentPage('services')}>Services</button>
        <button onClick={() => setCurrentPage('pricing')}>Pricing</button>
        <button onClick={() => setCurrentPage('contact')}>Contact</button>
      </nav>
      <main>
        {renderPage()}
      </main>
      <footer style={{background: '#333', color: 'white', padding: '20px', textAlign: 'center'}}>
        &copy; 2023 Yoshikawa Detective Agency
      </footer>
    </div>
  );
};

export default YoshikawaDetectiveAgencyWebsite;