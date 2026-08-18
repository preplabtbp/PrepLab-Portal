import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEquipments, getEmployees, updateToolPhotoUrl, uploadPhotoToDrive, appendRowsToSheet, ToolRecord } from '@/src/sheets-api';

export interface ToolStatus {
  condition: string | null;
  notes: string;
  breakdownTime: string;
  goodChecklist?: string[];
}

export const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // max size
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type, 0.7));
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

export function useInspection(equipmentCategories: {category: string, tools: ToolRecord[]}[]) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sectionGuideOpen, setSectionGuideOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ToolStatus>>(() => {
    try {
      const saved = localStorage.getItem('p2h_statuses_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load saved progress", e);
    }
    return {};
  });

  const [activePhotoTool, setActivePhotoTool] = useState<ToolRecord | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [shift, setShift] = useState<string>(() => localStorage.getItem('p2h_current_shift') || '1 (Pagi)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    staleTime: 1000 * 60 * 5,
  });

  const employees = employeesData || [];

  useEffect(() => {
    localStorage.setItem('p2h_statuses_draft', JSON.stringify(statuses));
  }, [statuses]);

  useEffect(() => {
    localStorage.setItem('p2h_current_shift', shift);
  }, [shift]);
  
  const activeTools = equipmentCategories.find(c => c.category === activeCategory)?.tools || [];

  return {
    activeCategory, setActiveCategory,
    sectionGuideOpen, setSectionGuideOpen,
    statuses, setStatuses,
    activePhotoTool, setActivePhotoTool,
    uploadingPhoto, setUploadingPhoto,
    shift, setShift,
    isSubmitting, setIsSubmitting,
    isSuccess, setIsSuccess,
    employees, setEmployees: () => {}, // Maintain compatibility
    activeTools
  };
}
