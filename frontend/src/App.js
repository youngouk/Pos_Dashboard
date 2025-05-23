import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardProvider } from './contexts/DashboardContext';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ComparePage from './pages/ComparePage';
import NoticePage from './pages/NoticePage';
import ApiTestPage from './pages/ApiTestPage';
import TrendsPage from './pages/TrendsPage';
import StoreStatusAnalysisPage from './pages/BlankPage';
import BenchmarkComparePage from './pages/BenchmarkComparePage';

function App() {
  return (
    <DashboardProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/benchmark" element={<BenchmarkComparePage />} />
            <Route path="/notice" element={<NoticePage />} />
            <Route path="/api-test" element={<ApiTestPage />} />
            <Route path="/blank" element={<StoreStatusAnalysisPage />} />
          </Routes>
        </Layout>
      </Router>
    </DashboardProvider>
  );
}

export default App;
