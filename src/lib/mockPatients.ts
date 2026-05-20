export interface MockPatient {
  id: string; // MRN + Name format
  mrn: string;
  name: string;
  abo: string;
  rhd: string;
}

export const MOCK_PATIENTS: MockPatient[] = [
  { id: 'MRN-1001 (Nguyen Van A)', mrn: 'MRN-1001', name: 'Nguyen Van A', abo: 'O', rhd: 'Positive' },
  { id: 'MRN-1002 (Tran Thi B)', mrn: 'MRN-1002', name: 'Tran Thi B', abo: 'A', rhd: 'Positive' },
  { id: 'MRN-1003 (Le Van C)', mrn: 'MRN-1003', name: 'Le Van C', abo: 'B', rhd: 'Positive' },
  { id: 'MRN-1004 (Pham Thi D)', mrn: 'MRN-1004', name: 'Pham Thi D', abo: 'AB', rhd: 'Positive' },
  { id: 'MRN-1005 (Hoang Van E)', mrn: 'MRN-1005', name: 'Hoang Van E', abo: 'O', rhd: 'Negative' },
  { id: 'MRN-1006 (Vu Thi F)', mrn: 'MRN-1006', name: 'Vu Thi F', abo: 'A', rhd: 'Negative' },
  { id: 'MRN-1007 (Dang Van G)', mrn: 'MRN-1007', name: 'Dang Van G', abo: 'B', rhd: 'Negative' },
  { id: 'MRN-1008 (Bui Thi H)', mrn: 'MRN-1008', name: 'Bui Thi H', abo: 'AB', rhd: 'Negative' },
  { id: 'MRN-1009 (Do Van I)', mrn: 'MRN-1009', name: 'Do Van I', abo: 'O', rhd: 'Positive' },
  { id: 'MRN-1010 (Ho Thi K)', mrn: 'MRN-1010', name: 'Ho Thi K', abo: 'A', rhd: 'Positive' },
  { id: 'MRN-1011 (Ngo Van L)', mrn: 'MRN-1011', name: 'Ngo Van L', abo: 'B', rhd: 'Positive' },
  { id: 'MRN-1012 (Duong Thi M)', mrn: 'MRN-1012', name: 'Duong Thi M', abo: 'AB', rhd: 'Positive' },
  { id: 'MRN-1013 (Ly Van N)', mrn: 'MRN-1013', name: 'Ly Van N', abo: 'O', rhd: 'Positive' },
  { id: 'MRN-1014 (Truong Thi P)', mrn: 'MRN-1014', name: 'Truong Thi P', abo: 'A', rhd: 'Positive' },
  { id: 'MRN-1015 (John Doe - Foreigner)', mrn: 'MRN-1015', name: 'John Doe', abo: 'O', rhd: 'Negative' },
  { id: 'MRN-1016 (Jane Smith - Foreigner)', mrn: 'MRN-1016', name: 'Jane Smith', abo: 'A', rhd: 'Negative' },
  { id: 'MRN-1017 (Trauma-Alpha Unknown)', mrn: 'MRN-1017', name: 'Trauma-Alpha', abo: 'Unknown', rhd: 'Unknown' },
  { id: 'MRN-1018 (Trauma-Bravo Unknown)', mrn: 'MRN-1018', name: 'Trauma-Bravo', abo: 'Unknown', rhd: 'Unknown' }
];
