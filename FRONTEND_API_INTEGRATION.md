# BEAM for Individuals - Frontend API Integration Guide

Complete guide for integrating BEAM frontend with backend API.

## API Base URLs

```
Development: http://localhost:3000
Production: https://beam.example.com
```

## Authentication Flow

### 1. Request Verification Code
```javascript
async function requestVerificationCode(email) {
  const response = await fetch('http://localhost:3000/api/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
}
```

### 2. Verify Code
```javascript
async function verifyCode(email, code) {
  const response = await fetch('http://localhost:3000/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('session_token', data.session_token);
  }
  return data;
}
```

### 3. Complete Signup
```javascript
async function completeSignup(ownerName) {
  const token = localStorage.getItem('session_token');
  const response = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ owner_name: ownerName })
  });
  return response.json();
}
```

## Website Management

### Create Website
```javascript
async function createWebsite(businessData) {
  const token = localStorage.getItem('session_token');
  const response = await fetch('http://localhost:3000/api/websites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(businessData)
  });
  return response.json();
}

// Usage
const website = await createWebsite({
  business_name: 'My Hair Salon',
  business_type: 'Hair Salon',
  location: 'New York, NY',
  website_url: 'https://myhairsalon.com'
});
```

### List Websites
```javascript
async function listWebsites(page = 1, limit = 10) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites?page=${page}&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

### Get Website Details
```javascript
async function getWebsite(websiteId) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites/${websiteId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

## Threat Assessment

### Get Current Threat
```javascript
async function getThreatAssessment(websiteId) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites/${websiteId}/threat`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

### Get Threat History
```javascript
async function getThreatHistory(websiteId, months = 12) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites/${websiteId}/threat-history?months=${months}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

## Competitor Management

### Discover Competitors
```javascript
async function discoverCompetitors(websiteId) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites/${websiteId}/discover-competitors`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}

// Usage with polling
async function startDiscoveryAndWait(websiteId) {
  const discovery = await discoverCompetitors(websiteId);
  console.log('Discovery started:', discovery.job_id);
  
  // Poll every 5 seconds
  const pollInterval = setInterval(async () => {
    const threat = await getThreatAssessment(websiteId);
    if (threat.threat && threat.threat.threat_level) {
      console.log('Discovery complete:', threat.threat.threat_level);
      clearInterval(pollInterval);
    }
  }, 5000);
}
```

### List Competitors
```javascript
async function listCompetitors(websiteId, page = 1, limit = 10) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites/${websiteId}/competitors?page=${page}&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

## Keywords & Actions

### Get Keywords
```javascript
async function getKeywords(websiteId, page = 1, limit = 20) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites/${websiteId}/keywords?page=${page}&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

### Get Recommended Actions
```javascript
async function getActions(websiteId, priority = null, page = 1, limit = 10) {
  const token = localStorage.getItem('session_token');
  let url = `http://localhost:3000/api/websites/${websiteId}/actions?page=${page}&limit=${limit}`;
  if (priority) url += `&priority=${priority}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

### Complete Action
```javascript
async function completeAction(websiteId, actionId) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites/${websiteId}/actions/${actionId}/complete`,
    {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

## Reports

### Get Latest Report
```javascript
async function getLatestReport(websiteId) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites/${websiteId}/reports/latest`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

### Get Report History
```javascript
async function getReportHistory(websiteId, page = 1, limit = 12) {
  const token = localStorage.getItem('session_token');
  const response = await fetch(
    `http://localhost:3000/api/websites/${websiteId}/reports/history?page=${page}&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

## Subscription Management

### Create Subscription
```javascript
async function createSubscription() {
  const token = localStorage.getItem('session_token');
  const response = await fetch('http://localhost:3000/api/subscription/create', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// Usage with Stripe
async function handleSubscriptionCheckout() {
  const { client_secret, amount } = await createSubscription();
  
  // Use Stripe.js to confirm payment
  const { paymentIntent } = await stripe.confirmCardPayment(client_secret, {
    payment_method: {
      card: cardElement,
      billing_details: { name: 'John Doe' }
    }
  });
  
  if (paymentIntent.status === 'succeeded') {
    console.log('Payment successful!');
  }
}
```

### Get Subscription
```javascript
async function getSubscription() {
  const token = localStorage.getItem('session_token');
  const response = await fetch('http://localhost:3000/api/subscription', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

### Cancel Subscription
```javascript
async function cancelSubscription(reason) {
  const token = localStorage.getItem('session_token');
  const response = await fetch('http://localhost:3000/api/subscription/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });
  return response.json();
}
```

## Business Types

### Get All Business Types
```javascript
async function getBusinessTypes() {
  const response = await fetch('http://localhost:3000/api/business-types');
  return response.json();
}
```

### Get Business Types by Category
```javascript
async function getBusinessTypesByCategory(category) {
  const response = await fetch(
    `http://localhost:3000/api/business-types/category/${encodeURIComponent(category)}`
  );
  return response.json();
}
```

## User Account

### Get Profile
```javascript
async function getProfile() {
  const token = localStorage.getItem('session_token');
  const response = await fetch('http://localhost:3000/api/user/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

### Update Profile
```javascript
async function updateProfile(ownerName) {
  const token = localStorage.getItem('session_token');
  const response = await fetch('http://localhost:3000/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ owner_name: ownerName })
  });
  return response.json();
}
```

### Logout
```javascript
async function logout() {
  const token = localStorage.getItem('session_token');
  await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  localStorage.removeItem('session_token');
  window.location.href = '/login';
}
```

## Error Handling

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('session_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - clear session and redirect
        localStorage.removeItem('session_token');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      
      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      
      throw new Error(data.error || 'API error');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Usage
try {
  const websites = await apiCall('http://localhost:3000/api/websites');
  console.log(websites);
} catch (error) {
  console.error('Failed to fetch websites:', error.message);
}
```

## React Hooks Example

```javascript
import { useState, useEffect } from 'react';

function useAPI(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('session_token');
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(endpoint, {
          ...options,
          headers
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [endpoint, options]);

  return { data, loading, error };
}

// Usage in component
function Dashboard() {
  const { data: websites, loading, error } = useAPI('http://localhost:3000/api/websites');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {websites?.websites?.map(site => (
        <div key={site.id}>{site.business_name}</div>
      ))}
    </div>
  );
}
```

---

**Frontend integration is ready. All API endpoints are documented and tested.**
