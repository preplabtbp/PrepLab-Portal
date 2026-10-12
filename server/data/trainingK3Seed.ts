// Data awal Training K3 (WAH, LOTO, Confined Space, Basic Fire Fighting) —
// isi asli file Training_WAH_LOTO_CONFINE_SPACE_FIRE_FIGHTER_2.csv (Okt 2026).
// Diparse dengan parser yang sama dengan fitur Import (src/utils/training-import.ts).
export const TRAINING_K3_SEED_CSV = `NO,NIK,NAMA KARYAWAN,Shift,BAGIAN,JABATAN,PT,GOL,WAH,Status,LOTO,Status.1,CONFINED SPACE,Status.2,Basic Fire Fighting,Status.3
1,02D21001017,Christian Anggawijaya,Nonshift,Maintenance,Laboratory Maintenance Supervisor,GPS,III,2023-03-31 00:00:00,PASS,2022-12-10,PASS,2025-05-05,PASS,2026-09-26 00:00:00,PASS
2,04D21001046,Moch. Siswanto,Nonshift,Maintenance,Laboratory Maintenance Supervisor,TBP,III,2023-03-17 00:00:00,PASS,2022-12-14,PASS,,,-,-
3,02D22000018,Subrandi,B,Preparation,"Preparation Supervisor, Dry",GPS,III,-,-,2026-03-03,PASS,,,-,-
4,04D25000020,Mohamad Noer Syafi’i,A,Preparation,"Preparation Foreman, Wet",TBP,II,2026-05-12 00:00:00,PASS,,,,,-,-
5,M0402230097,Zaenal Abidin,A,Maintenance,Laboratory Maintenance Foreman,TBP,II,2025-02-20 00:00:00,PASS,2025-06-24,PASS,,,-,-
6,M0402230233,Yulianus Tiku Mangando,B,Maintenance,Laboratory Maintenance Foreman,TBP,II,2025-02-13 00:00:00,PASS,2025-12-16,PASS,2025-05-05,PASS,-,-
7,04D24000078,Imran S,A,Maintenance,Laboratory Maintenance Foreman,TBP,II,2025-02-06 00:00:00,PASS,2024-11-11,PASS,,,2026-10-03 00:00:00,Pending
8,02D25000052,Ridhan Ahmadurabbi,B,Maintenance,Laboratory Maintenance Foreman,GPS,II,2026-07-18 00:00:00,PASS,2025-06-24,PASS,,,-,-
9,M0404220418,Burhanudin La Wio,A,Maintenance,Laboratory Maintenance Foreman,TBP,I,2025-02-06 00:00:00,PASS,2025-06-24,PASS,,,-,-
10,04D19000564,Janter Jaya Barimbing,B,Preparation,"Preparation Supervisor, Wet",TBP,III,-,-,,,,,-,-
11,02D23000052,Ryan M Rusli,A,Preparation,"Preparation Supervisor, Dry",GPS,III,-,-,,,,,-,-
12,M0204190282,La Alwino La Ode Pudu,A,Maintenance,"Crew, Preparation & Laboratory",GPS,I,2026-09-05 00:00:00,PASS,2026-03-03,PASS,,,-,-
13,M0405210034,Yus Putra Firiyanto,B,Maintenance,"Crew, Preparation & Laboratory",TBP,I,2026-07-31 00:00:00,PASS,2026-01-02,PASS,,,-,-
14,M0409210113,La Juanda La Ce,B,Maintenance,"Crew, Preparation & Laboratory",TBP,I,-,-,2025-12-16,PASS,,,-,-
15,M0202220050,Muhamad Syaifuddin Z,B,Maintenance,"Crew, Laboratory Maintenance",GPS,I,2025-01-15 00:00:00,PASS,2024-10-21,PASS,2025-05-05,PASS,-,-
16,M0206230531,Mhd. Dahlan Ahmad,A,Maintenance,"Crew, Laboratory Maintenance",GPS,I,2024-12-16 00:00:00,PASS,2024-10-21,PASS,2025-05-05,PASS,-,-
17,M0407240467,Samuel Skiffer Kellah,A,Maintenance,"Crew, Laboratory Maintenance",TBP,I,2025-02-06 00:00:00,PASS,2024-11-11,PASS,,,-,-
18,M0210190730,Natanel Tooli,A,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
19,M0207190464,Aneldi Muneri,A,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
20,M0206230586,Karlos Yafet,A,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
21,M0402230122,Madraji,A,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
22,M0405210002,Anadir M. Likur,A,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
23,M0202220068,Rifaldi I. Arifin,A,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
24,M0203220108,Marlin Muhammad,A,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-08-08 00:00:00,PASS,,,,,-,-
25,M0406220785,Jasriwijaya Ikram,A,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-06 00:00:00,PASS,,,,,-,-
26,M0407221010,Buce Bobrikit,A,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
27,M0407221077,Agim Maulana Barmawi,A,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-06 00:00:00,PASS,,,,,-,-
28,M0412221652,Suryadi La Samusu,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,2025-02-20 00:00:00,PASS,,,,,-,-
29,M0412221653,Fajrin Muin,A,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-09-05 00:00:00,PASS,,,,,-,-
30,M0209230815,Muslim Wabula,A,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-05-12 00:00:00,PASS,,,,,-,-
31,M0402240080,Fikri La Atu,A,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-08-22 00:00:00,PASS,,,,,-,-
32,M0402240108,Fahdin S. Kadim,A,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-09-19 00:00:00,PASS,,,,,-,-
33,M0211240706,Risno Hamid,A,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-09-19 00:00:00,PASS,,,,,-,-
34,M0204250504,M. Hadi Mubarok,A,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-09-05 00:00:00,PASS,,,,,-,-
35,M0205250631,Aldi Bobrikit,A,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-08-08 00:00:00,PASS,,,,,-,-
36,M0402230213,La Topo,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
37,M0408210002,Hariyatno La Jaya,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
38,M0203220101,Jusrandi,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
39,M0203220110,Rifa Nuridi,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
40,M0407221012,Ruslan Tabaika,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
41,M0407221074,Abdul Manan R. Day,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-08-22 00:00:00,PASS,,,,,-,-
42,M0402240075,Erwin Asnawi,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-06 00:00:00,PASS,,,,,-,-
43,M0407240461,Robinson Sumtaki,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-20 00:00:00,PASS,,,,,-,-
44,M0407240479,Samsir Abubakar,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
45,M0408240485,La Arisan La Atu,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-06 00:00:00,PASS,,,,,-,-
46,M0211240707,Hendra Alfons,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-08-08 00:00:00,PASS,,,,,-,-
47,M0211240708,Muhammad Nasir,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-08-22 00:00:00,PASS,,,,,-,-
48,M0211240709,La Ode Elfian,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
49,M0211240712,La Herno,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-08-08 00:00:00,PASS,,,,,2026-10-03 00:00:00,Pending
50,M0201250001,Kardi Tamsil,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
51,M0201250016,Andi Haji,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-08-22 00:00:00,PASS,,,,,-,-
52,M0205250630,La Ode Muhammad Faldin,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
53,M0206250799,La Ferdi,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
54,M0206250813,Azzam Jufri,A,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-09-19 00:00:00,PASS,,,,,-,-
55,M0407250889,Randi Nasarudin,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-09-05 00:00:00,PASS,,,,,-,-
56,M0410251163,Ardian Wally,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-09-05 00:00:00,PASS,,,,,-,-
57,M0412251306,Ardi Arman,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-09-19 00:00:00,PASS,,,,,-,-
58,M0208230714,Darno La Bungahari,B,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
59,M0402230098,Sirajuddin,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
60,M0204190253,Sumarlin Muhammad,B,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
61,M0411230957,Saman Dokulamo,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-07-18 00:00:00,PASS,,,,,-,-
62,M0408210022,Ridwan Kedafota,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-13 00:00:00,PASS,,,,,-,-
63,M0202220067,Husen Dahlan,B,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,2024-12-16 00:00:00,PASS,,,,,-,-
64,M0202220093,Sarman La Bunga,B,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
65,M0405220496,Riski Djafrudin,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-13 00:00:00,PASS,,,,,-,-
66,M0406220815,Sardin La Harmoto,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
67,M0407221009,Jimi Muhamad Dun,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-07-18 00:00:00,PASS,,,,,-,-
68,M0412221627,La Rifan,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-07-31 00:00:00,PASS,,,,,-,-
69,M0412221654,Rifandi Samsudin,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-09-12 00:00:00,PASS,,,,,-,-
70,M0412221674,Ramadan Muhamad,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-09-12 00:00:00,PASS,,,,,-,-
71,M0403240127,Sahrin Hairun,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
72,M0403240136,Moh. Irsan Lajunaidi,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-27 00:00:00,PASS,,,,,-,-
73,M0211240748,Muh Dirgahayu Risaldi,B,"Dry, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-07-31 00:00:00,PASS,,,,,-,-
74,M0402230164,Daud Kedafota,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
75,M0202220052,Risal Nurdin,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2025-02-27 00:00:00,PASS,,,,,-,-
76,M0203220103,Muis La Besi,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2025-01-15 00:00:00,PASS,,,,,-,-
77,M0407220997,La Jojo,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-07-31 00:00:00,PASS,,,,,-,-
78,M0412221624,La Ode Hartanto,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-01-15 00:00:00,PASS,,,,,-,-
79,M0402240079,La Ode Nur Asgar,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-13 00:00:00,PASS,,,,,-,-
80,M0402240085,Firmansya Tueka,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
81,M0407240460,Akmal,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-07-31 00:00:00,PASS,,,,,-,-
82,M0407240464,Muhamad Nof Nurleti,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2025-02-13 00:00:00,PASS,,,,,-,-
83,M0407240478,Nezar,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
84,M0211240704,Chandra Ady Guna,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2025-02-27 00:00:00,PASS,,,,,-,-
85,M0211240711,Wanto Koilo,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2025-01-15 00:00:00,PASS,,,,,-,-
86,M0211240740,Gian Awaludin,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
87,M0212240804,Yakub Umar,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
88,M0201250003,Ridha Putra,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
89,M0201250045,Muhammad Restu,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-07-18 00:00:00,PASS,,,,,-,-
90,M0201250046,Nanda Nahumarury,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
91,M0202250054,Sakir Kuilo,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-09-12 00:00:00,PASS,,,,,-,-
92,M0205250594,La Ode Faldianto,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
93,M0205250596,Afnal,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-07-31 00:00:00,PASS,,,,,-,-
94,M0206250740,Muhaimin M. Hasan,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,2026-07-18 00:00:00,PASS,,,,,-,-
95,M0206250812,Anggi Putra Kamani,B,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
96,M0407250842,Marlon Tukan,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
97,M0410251165,M. Ridah Kardi,B,"Dry, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
98,M0410251164,Fahrezy U. Kamarullah,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,2026-09-12 00:00:00,PASS,,,,,-,-
99,M0401260003,Sarjon Jaya Putra,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
100,M0406220751,Safar Laalewu,Nonshift,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
101,M0210240669,La Ode Rizkin,Nonshift,"Wet, Preparation","Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
102,M0403260140,Muhammad Subir,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
103,M0405260266,La Ode Surdin,A,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
104,M0404260183,Jakrin Ode Muniru,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
105,M0406260342,La Alfian La Idu,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
106,M0406260356,Rahmatul Hidayah,B,"Wet, Preparation","Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
107,M0402230134,Wahyu Jabir,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
108,M0203220102,Ramadhan W. Anwar,A,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
109,M0203220123,Hairun Umawaitina,A,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
110,M0406220796,Naslim Muksin,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
111,M0412221623,Harji La Ila,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
112,M0406230606,La Bayu,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
113,M0412221673,Ahmad Sudirman,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
114,M0407230672,Ardila Rusli,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
115,M0212210097,Riko Saputra Day,A,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
116,M0401230050,Dulmihdat Tomayou,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
117,M0405240290,Randi Zakaria,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,2026-10-03 00:00:00,Pending
118,M0402240076,Arlan Hi. Yusup,A,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
119,M0210230879,Alfris Badaruni,A,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
120,M0402230188,Jarfin Saharudin,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
121,M0402230199,Sukri Koco,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
122,M0406210029,La Dai,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,, ,,,-,-
123,M0406220795,Irman Welhemus,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
124,M0407221011,Agusman Suaib,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
125,M0412221625,Iran Rumbia,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
126,M0202220051,Rahmat Purnomo,B,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
127,M0203220144,Risdiyanto Ladedi,B,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
128,M0411221527,Hasbi Nuh,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
129,M0402240078,Muh. Alif Multazam NH,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
130,M0209240583,La Wisnu,B,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
131,M0403240155,Jasri,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
132,M0203220111,Moh. Safrin,B,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
133,M0203250155,Sahrul Sanusi,B,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
134,M0201250032,Imran Sebualamo,B,Laboratory,"Crew, Preparation & Laboratory",GPS,I,-,-,,,,,-,-
135,M0409251014,Zhiran Arrazy Barmawi Putra,B,Laboratory,"Crew, Preparation & Laboratory",TBP,I,-,-,,,,,-,-
136,02D18000192,Khaufi Wirawan Aligora,B,Laboratory,Laboratory Supervisor,GPS,III,-,-,,,,,-,-
137,02D21001045,Arthur Paul Marnix Souisa,A,Laboratory,Laboratory Supervisor,GPS,III,-,-,,,,,-,-
138,04D21001049,Muhammad Amran Selang,A,Laboratory,Laboratory Supervisor,TBP,III,-,-,,,,,-,-
139,04D21001047,"Sukarman A. Akil, ST",Nonshift,QA,Quality Assurance Specialist,TBP,III,-,-,,,,,-,-
140,02D25000012,"Muhammad Nova Herisandi, S.Sos",Nonshift,Inventory Control,Inventory Control Supervisor,GPS,III,-,-,,,,,-,-
141,M0403240177,Aldy Aldersun Puluh,Nonshift,Administration,"Admin, Preparation & Laboratory",TBP,II,-,-,,,,,-,-
142,M0411251243,Agung Adi Putra Prasetyo,Nonshift,Administration,"Admin, Preparation & Laboratory",TBP,II,-,-,,,,,-,-
143,M0206250732,Muhammad Iqbal,Nonshift,Administration,"Admin, Preparation & Laboratory",GPS,II,-,-,,,,,-,-
144,M0412251310,Derald Febri Andriano Tjiwili,Nonshift,Administration,"Admin, Inventory Control",TBP,II,-,-,,,,,-,-
145,M0407240439,Raldy Chevien Aryando Dareno,Nonshift,Inventory Control,"Admin, Inventory Control",TBP,II,-,-,,,,,-,-
146,M0407250859,Muh. Yusri Mubarak,Nonshift,Inventory Control,"Admin, Inventory Control",TBP,II,-,-,,,,,-,-
147,M0403190701,Murti Tamisari Harun,Nonshift,Laboratory,"Preparation Foreman, Wet",TBP,II,-,-,,,,,-,-
148,04D24000042,Junjunan Muhammad Syukur,Nonshift,QA,Quality Assurance Officer,TBP,II,-,-,,,,,-,-
149,02D25000055,Muhamad Anugrah Ramadhan,Nonshift,QA,Quality Assurance Officer,GPS,II,-,-,,,,,-,-
150,02D24000043,Muhamad Alvin Febriansyah,Nonshift,Laboratory,Laboratory Foreman ,GPS,II,-,-,,,,,-,-
151,M0209221325,Valdi Pratama,A,Preparation,"Preparation Foreman, Dry ",GPS,II,2026-08-22 00:00:00,PASS,,,,,-,-
152,M0401200565,Hariyanto Aludin,A,Preparation,"Preparation Foreman, Wet",TBP,II,2026-09-19 00:00:00,PASS,,,,,-,-
153,M0406190526,Roy Marten Bobrikit,A,Preparation,"Preparation Foreman, Wet",TBP,II,-,-,,,,,-,-
154,M0405190523,Nyong Dokolamo,A,Preparation,"Preparation Foreman, Wet",TBP,II,-,-,,,,,-,-
155,M0403230267,Suhardi Hasan,A,Preparation,"Preparation Foreman, Dry ",TBP,II,2025-02-20 00:00:00,PASS,,,,,-,-
156,02D25000069,Karolus Megawanto Lebang,A,Preparation,"Preparation Foreman, Wet",GPS,II,2026-08-08 00:00:00,PASS,,,,,-,-
157,02D24000045,Muhammad Djody Satriani,A,"Wet, Preparation",Laboratory Foreman ,GPS,II,-,-,,,,,2026-10-03 00:00:00,Pending
158,M0201220012,"Taufikir, S.Pi",A,Preparation,"Preparation Foreman, Wet",GPS,II,2026-09-05 00:00:00,PASS,,,,,-,-
159,M0208230715,Rusli Rorano,A,Preparation,"Preparation Foreman, Wet",GPS,II,-,-,,,,,-,-
160,04D25000064,Muhammad Ardiyan Syah Darmawan,B,Preparation,"Preparation Foreman, Wet",TBP,II,-,-,,,,,-,-
161,02D25000046,Ryan Tiarna,B,Preparation,"Preparation Foreman, Dry ",GPS,II,-,-,,,,,2026-09-26 00:00:00,PASS
162,02D24000060,Haidir Febbyansyah Saputra,B,Preparation,"Preparation Foreman, Dry ",GPS,II,2026-09-12 00:00:00,PASS,,,,,-,-
163,02D24000058,A Muh Ilham Hasmar,B,Preparation,"Preparation Foreman, Dry ",GPS,II,2026-07-31 00:00:00,PASS,,,,,-,-
164,M0403190256,Arsun Lantia,B,Preparation,"Preparation Foreman, Wet",TBP,II,-,-,,,,,-,-
165,M0403230260,La Ode Dendi,B,Preparation,"Preparation Foreman, Dry ",TBP,II,-,-,,,,,-,-
166,M0210190717,La Sapiu,B,Preparation,"Preparation Foreman, Dry ",GPS,II,2026-07-18 00:00:00,PASS,,,,,-,-
167,04D25000055,Mahardian Muhamad Firdaus,B,Preparation,"Preparation Foreman, Wet",TBP,II,-,-,,,,,-,-
168,M0203220142,Abdul Azis,B,Preparation,"Preparation Foreman, Dry ",GPS,II,2025-02-27 00:00:00,PASS,,,,,-,-
169,04D26000015,Gusti Nur Firdaus,A,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
170,02D22000023,Muhammad Reza Satria,A,Laboratory,Laboratory Foreman ,GPS,II,-,-,,,,,-,-
171,04D22000094,Kemal Maulana,A,Laboratory,Laboratory Foreman ,TBP,II,-,-,,,,,-,-
172,04D23000035,Ahmad Jusma Azhari Annur,A,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
173,04D24000068,Muhammad Fandy Septiawan,A,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
174,04D25000053,Muhammad Atha Ghali,A,Laboratory,"Preparation Foreman, Wet",TBP,II,-,-,,,,,-,-
175,04D26000012,Nurhafiz Syahputra,A,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
176,04D26000070,Rahmad Azizul Khakim,A,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
177,04D23000025,M. Harits Asyardy,B,Laboratory,Laboratory Foreman ,TBP,II,-,-,,,,,-,-
178,02D23000024,Fachmi Amarullah,B,Laboratory,Laboratory Foreman,GPS,II,-,-,,,,,-,-
179,04D24000056,Rizal Zaelani,B,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,2026-09-26 00:00:00,PASS
180,04D24000057,Herwin Predianto,B,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
181,04D25000059,Anresansia Winesha Pandit,B,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
182,02D25000050,Ayup Riyan Redondo,B,Laboratory,Laboratory Foreman,GPS,II,-,-,,,,,-,-
183,04D25000067,Andika Dafa Rusdiarta,B,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
184,04D26000016,Riyan Panji Putra,B,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
185,04D26000067,Muhammad Furqan,B,Laboratory,Laboratory Foreman,TBP,II,-,-,,,,,-,-
`;
