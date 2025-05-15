import React, { createContext, useContext, useState } from 'react';
import contestService, { Contest, CreateContestData } from '../services/contestService';

interface ContestContextType {
  contests: Contest[];
  currentContest: Contest | null;
  isLoading: boolean;
  error: string | null;
  totalContests: number;
  currentPage: number;
  totalPages: number;
  getContests: (filters?: { status?: string; page?: number; limit?: number }) => Promise<void>;
  getContest: (id: string) => Promise<void>;
  createContest: (data: CreateContestData) => Promise<Contest>;
  updateContest: (id: string, data: CreateContestData) => Promise<Contest>;
  deleteContest: (id: string) => Promise<void>;
  joinContest: (id: string) => Promise<void>;
  approveContest: (id: string, notes?: string) => Promise<void>;
  rejectContest: (id: string, notes?: string) => Promise<void>;
  clearError: () => void;
}

const ContestContext = createContext<ContestContextType>({
  contests: [],
  currentContest: null,
  isLoading: false,
  error: null,
  totalContests: 0,
  currentPage: 1,
  totalPages: 1,
  getContests: async () => {},
  getContest: async () => {},
  createContest: async () => ({} as Contest),
  updateContest: async () => ({} as Contest),
  deleteContest: async () => {},
  joinContest: async () => {},
  approveContest: async () => {},
  rejectContest: async () => {},
  clearError: () => {}
});

export const useContests = () => useContext(ContestContext);

export const ContestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [currentContest, setCurrentContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalContests, setTotalContests] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const getContests = async (filters?: { status?: string; page?: number; limit?: number }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await contestService.getContests(filters);
      setContests(response.contests);
      setTotalContests(response.pagination.total);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.pages);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch contests';
      setError(errorMessage);
      console.error('Error fetching contests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getContest = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await contestService.getContest(id);
      setCurrentContest(response.contest);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch contest details';
      setError(errorMessage);
      console.error('Error fetching contest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createContest = async (data: CreateContestData): Promise<Contest> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await contestService.createContest(data);
      // Refresh the contest list after creating a new one
      await getContests();
      return response.contest;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create contest';
      setError(errorMessage);
      console.error('Error creating contest:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateContest = async (id: string, data: CreateContestData): Promise<Contest> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await contestService.updateContest(id, data);
      
      // Update in the current list if it exists
      setContests(prevContests => 
        prevContests.map(c => c.id === id ? response.contest : c)
      );
      
      // Update current contest if it's the one being edited
      if (currentContest && currentContest.id === id) {
        setCurrentContest(response.contest);
      }
      
      return response.contest;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update contest';
      setError(errorMessage);
      console.error('Error updating contest:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteContest = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await contestService.deleteContest(id);
      
      // Remove from the current list
      setContests(prevContests => prevContests.filter(c => c.id !== id));
      
      // Clear current contest if it's the one being deleted
      if (currentContest && currentContest.id === id) {
        setCurrentContest(null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete contest';
      setError(errorMessage);
      console.error('Error deleting contest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const joinContest = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await contestService.joinContest(id);
      
      // Update in the current list if it exists
      setContests(prevContests => 
        prevContests.map(c => c.id === id ? response.contest : c)
      );
      
      // Update current contest if it's the one being joined
      if (currentContest && currentContest.id === id) {
        setCurrentContest(response.contest);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to join contest';
      setError(errorMessage);
      console.error('Error joining contest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const approveContest = async (id: string, notes?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await contestService.approveContest(id, notes);
      
      // Update in the current list if it exists
      setContests(prevContests => 
        prevContests.map(c => c.id === id ? response.contest : c)
      );
      
      // Update current contest if it's the one being approved
      if (currentContest && currentContest.id === id) {
        setCurrentContest(response.contest);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to approve contest';
      setError(errorMessage);
      console.error('Error approving contest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const rejectContest = async (id: string, notes?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await contestService.rejectContest(id, notes);
      
      // Update in the current list if it exists
      setContests(prevContests => 
        prevContests.map(c => c.id === id ? response.contest : c)
      );
      
      // Update current contest if it's the one being rejected
      if (currentContest && currentContest.id === id) {
        setCurrentContest(response.contest);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to reject contest';
      setError(errorMessage);
      console.error('Error rejecting contest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <ContestContext.Provider
      value={{
        contests,
        currentContest,
        isLoading,
        error,
        totalContests,
        currentPage,
        totalPages,
        getContests,
        getContest,
        createContest,
        updateContest,
        deleteContest,
        joinContest,
        approveContest,
        rejectContest,
        clearError
      }}
    >
      {children}
    </ContestContext.Provider>
  );
}; 