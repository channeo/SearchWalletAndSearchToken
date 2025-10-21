// App.tsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Card, Spinner } from 'react-bootstrap';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Đăng ký plugin ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

interface TokenResult {
  address: string;
  name: string;
  symbol: string;
  source: string;
  totalSupply?: string;
  decimals?: number;
  totalSupplyFormatted?: string;
}

function App() {
  const [query, setQuery] = useState('');
  const [tokens, setTokens] = useState<TokenResult[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs cho animation
  const appRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Animation khi component mount
  useEffect(() => {
    const tl = gsap.timeline();
    
    if (titleRef.current) {
      tl.fromTo(titleRef.current, 
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "back.out(1.7)" }
      );
    }
    
    if (formRef.current) {
      tl.fromTo(formRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
        "-=0.5"
      );
    }

    // Background animation
    gsap.to("body", {
      background: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
      duration: 2,
      ease: "power1.inOut"
    });

  }, []);

  // Modal animation
  useEffect(() => {
    if (showPopup && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { scale: 0.8, opacity: 0, rotationY: 10 },
        { scale: 1, opacity: 1, rotationY: 0, duration: 0.6, ease: "back.out(1.7)" }
      );
    }
  }, [showPopup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    
    // Button click animation
    const button = e.currentTarget.querySelector('button');
    if (button) {
      gsap.to(button, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1
      });
    }

    try {
      const response = await axios.get(`http://localhost:3000/search?query=${query}`);
      const results = response.data;
      
      if (results.length > 0) {
        // Animate tokens appearance
        setTokens(results);
        setTimeout(() => {
          setShowPopup(true);
          setIsLoading(false);
        }, 500);
      } else {
        setIsLoading(false);
        if (formRef.current) {
          gsap.to(formRef.current, {
            x: 10,
            duration: 0.1,
            repeat: 5,
            yoyo: true,
            ease: "power1.inOut"
          });
        }
        alert('Không tìm thấy token.');
      }
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
      setIsLoading(false);
      alert('Lỗi khi tìm kiếm token.');
    }
  };

  const handleCloseModal = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        scale: 0.8,
        opacity: 0,
        rotationY: -10,
        duration: 0.4,
        ease: "power1.in",
        onComplete: () => setShowPopup(false)
      });
    } else {
      setShowPopup(false);
    }
  };

  return (
    <div className="App" ref={appRef}>
      <div className="animated-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="main-content">
              <h1 className="main-title" ref={titleRef}>
                <span className="title-gradient">Tìm kiếm Token</span>
              </h1>
              
              <Form onSubmit={handleSubmit} className="search-form" ref={formRef}>
                <Form.Group controlId="formToken" className="mb-4">
                  <Form.Label className="form-label">Nhập tên hoặc địa chỉ token</Form.Label>
                  <Form.Control
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ví dụ: Token B hoặc 0xF574D0c40D3f520360882ee9Eabc718cF6AEA339"
                    className="form-input"
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="search-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Đang tìm kiếm...
                    </>
                  ) : (
                    ' Tìm kiếm Token'
                  )}
                </Button>
              </Form>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        show={showPopup} 
        onHide={handleCloseModal}
        centered
        size="lg"
        className="token-modal"
      >
        <div ref={modalRef}>
          <Modal.Header closeButton className="modal-header-custom">
            <Modal.Title className="modal-title-custom">
              🎉 Kết quả tìm kiếm token
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="modal-body-custom">
            <div className="tokens-container">
              {tokens.map((token, index) => (
                <Card 
                  key={index} 
                  className="token-card mb-3"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Card.Body>
                    <div className="token-header">
                      <h4 className="token-name">
                        {token.name} ({token.symbol})
                      </h4>
                      <span className="token-badge">{token.source}</span>
                    </div>
                    
                    <div className="token-info">
                      <div className="info-item">
                        <strong>📍 Địa chỉ hợp đồng:</strong>
                        <code className="address-code">{token.address}</code>
                      </div>
                      
                      {token.totalSupply && (
                        <>
                          <div className="info-item">
                            <strong>💰 Tổng cung:</strong>
                            <span>{token.totalSupply}</span>
                          </div>
                          <div className="info-item">
                            <strong>🔢 Số thập phân:</strong>
                            <span>{token.decimals}</span>
                          </div>
                          <div className="info-item">
                            <strong>📊 Tổng cung định dạng:</strong>
                            <span>{token.totalSupplyFormatted}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer className="modal-footer-custom">
            <Button 
              variant="outline-primary" 
              onClick={handleCloseModal}
              className="close-button"
            >
              Đóng
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}

export default App;