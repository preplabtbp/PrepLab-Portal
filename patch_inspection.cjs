const fs = require('fs');

let code = fs.readFileSync('src/components/inspection-screen.tsx', 'utf-8');

const hookImport = `import { useInspection, ToolStatus, compressImage } from '../features/inspections/hooks/useInspection';\n`;
if (!code.includes('useInspection')) {
  code = code.replace(/import \{ DevModeAccordion, useDevOptions \} from '\.\/dev-mode-accordion';/, `import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';\n${hookImport}`);
}

// Remove old ToolStatus and compressImage
code = code.replace(/interface ToolStatus \{[\s\S]*?\}\n/, '');
code = code.replace(/const compressImage = async \([^)]+\): Promise<string> => \{[\s\S]*?\};\n/m, '');

const componentHook = `export function InspectionScreen({ inspectorName, equipmentCategories, reloadData, loading, inspectorNik }: { inspectorName: string, equipmentCategories: {category: string, tools: ToolRecord[]}[], reloadData: () => void, loading: boolean, inspectorNik: string }) {
  const {
    activeCategory, setActiveCategory,
    sectionGuideOpen, setSectionGuideOpen,
    statuses, setStatuses,
    activePhotoTool, setActivePhotoTool,
    uploadingPhoto, setUploadingPhoto,
    shift, setShift,
    isSubmitting, setIsSubmitting,
    isSuccess, setIsSuccess,
    employees, setEmployees,
    activeTools
  } = useInspection(equipmentCategories);
`;

const stateBlockRegex = /export function InspectionScreen[\s\S]*?const activeTools = equipmentCategories\.find\(c => c\.category === activeCategory\)\?\.tools \|\| \[\];/m;

code = code.replace(stateBlockRegex, componentHook);

fs.writeFileSync('src/components/inspection-screen.tsx', code);
