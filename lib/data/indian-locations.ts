// ── Indian Location Data: State → District → Cities ─────────
// Comprehensive real data for all major states

export interface StateData {
  districts: Record<string, string[]> // district → cities
}

export const INDIAN_STATES: Record<string, StateData> = {
  'Andhra Pradesh': {
    districts: {
      'Anantapur': ['Anantapur', 'Hindupur', 'Guntakal', 'Dharmavaram', 'Tadpatri'],
      'Chittoor': ['Chittoor', 'Tirupati', 'Madanapalle', 'Srikalahasti', 'Puttur'],
      'East Godavari': ['Kakinada', 'Rajahmundry', 'Amalapuram', 'Ramachandrapuram'],
      'Guntur': ['Guntur', 'Tenali', 'Narasaraopet', 'Mangalagiri', 'Bapatla'],
      'Krishna': ['Vijayawada', 'Machilipatnam', 'Gudivada', 'Nuzvid'],
      'Kurnool': ['Kurnool', 'Nandyal', 'Adoni', 'Yemmiganur'],
      'Nellore': ['Nellore', 'Kavali', 'Gudur', 'Atmakur'],
      'Prakasam': ['Ongole', 'Chirala', 'Markapur', 'Kandukur'],
      'Srikakulam': ['Srikakulam', 'Narasannapeta', 'Amadalavalasa'],
      'Visakhapatnam': ['Visakhapatnam', 'Anakapalle', 'Bheemunipatnam', 'Narsipatnam'],
      'Vizianagaram': ['Vizianagaram', 'Bobbili', 'Parvathipuram'],
      'West Godavari': ['Eluru', 'Bhimavaram', 'Tadepalligudem', 'Tanuku', 'Narsapur'],
      'YSR Kadapa': ['Kadapa', 'Proddatur', 'Rajampet', 'Jammalamadugu', 'Pulivendla'],
    }
  },
  'Arunachal Pradesh': {
    districts: {
      'Itanagar Capital Complex': ['Itanagar', 'Naharlagun'],
      'Tawang': ['Tawang'],
      'West Kameng': ['Bomdila'],
      'Papum Pare': ['Yupia'],
      'Lower Subansiri': ['Ziro'],
      'Changlang': ['Changlang'],
    }
  },
  'Assam': {
    districts: {
      'Baksa': ['Mushalpur'],
      'Barpeta': ['Barpeta', 'Howly', 'Sarthebari'],
      'Cachar': ['Silchar', 'Lakhipur', 'Karimganj'],
      'Darrang': ['Mangaldai', 'Sipajhar'],
      'Dibrugarh': ['Dibrugarh', 'Naharkatia', 'Moran'],
      'Goalpara': ['Goalpara', 'Lakhipur'],
      'Guwahati': ['Guwahati', 'Dispur', 'North Guwahati'],
      'Jorhat': ['Jorhat', 'Titabar', 'Mariani'],
      'Kamrup': ['Guwahati', 'Amingaon', 'Mirza'],
      'Kamrup Metropolitan': ['Guwahati', 'Dispur', 'Paltanbazar'],
      'Nagaon': ['Nagaon', 'Hojai', 'Lanka'],
      'Sivasagar': ['Sivasagar', 'Nazira', 'Sonari'],
      'Sonitpur': ['Tezpur', 'Rangapara', 'Dhekiajuli'],
      'Tinsukia': ['Tinsukia', 'Digboi', 'Margherita'],
    }
  },
  'Bihar': {
    districts: {
      'Araria': ['Araria', 'Forbesganj'],
      'Aurangabad': ['Aurangabad', 'Obra', 'Rafiganj'],
      'Begusarai': ['Begusarai', 'Bachwara'],
      'Bhagalpur': ['Bhagalpur', 'Sultanganj', 'Naugachhia'],
      'Bhojpur': ['Arrah', 'Jagdishpur', 'Dumraon'],
      'Darbhanga': ['Darbhanga', 'Benipur', 'Keotiranwy'],
      'Gaya': ['Gaya', 'Bodh Gaya', 'Sherghati', 'Tekari'],
      'Gopalganj': ['Gopalganj', 'Hathua'],
      'Jehanabad': ['Jehanabad', 'Makhdumpur'],
      'Muzaffarpur': ['Muzaffarpur', 'Sitamarhi', 'Motihari'],
      'Nalanda': ['Bihar Sharif', 'Rajgir', 'Islampur'],
      'Patna': ['Patna', 'Danapur', 'Phulwari Sharif', 'Masaurhi', 'Barh'],
      'Purnia': ['Purnia', 'Kasba', 'Baisi'],
      'Samastipur': ['Samastipur', 'Rosera', 'Dalsinghsarai'],
      'Saran': ['Chapra', 'Revelganj', 'Sonepur'],
      'Vaishali': ['Hajipur', 'Mahua', 'Raghopur'],
    }
  },
  'Chhattisgarh': {
    districts: {
      'Bastar': ['Jagdalpur', 'Kondagaon'],
      'Bilaspur': ['Bilaspur', 'Akaltara', 'Takhatpur'],
      'Dhamtari': ['Dhamtari', 'Kurud'],
      'Durg': ['Durg', 'Bhilai', 'Rajnandgaon'],
      'Janjgir-Champa': ['Janjgir', 'Champa', 'Sakti'],
      'Korba': ['Korba', 'Katghora'],
      'Mahasamund': ['Mahasamund', 'Saraipali'],
      'Raigarh': ['Raigarh', 'Gharghoda'],
      'Raipur': ['Raipur', 'Aarang', 'Abhanpur', 'Tilda'],
      'Rajnandgaon': ['Rajnandgaon', 'Dongargarh', 'Khairagarh'],
      'Surguja': ['Ambikapur', 'Manendragarh', 'Surajpur'],
    }
  },
  'Delhi': {
    districts: {
      'Central Delhi': ['Connaught Place', 'Karol Bagh', 'Paharganj', 'Daryaganj'],
      'East Delhi': ['Preet Vihar', 'Laxmi Nagar', 'Mayur Vihar', 'Patparganj'],
      'New Delhi': ['India Gate', 'Lodhi Colony', 'Chanakyapuri', 'Sarojini Nagar'],
      'North Delhi': ['Civil Lines', 'Model Town', 'Timarpur', 'Wazirabad'],
      'North East Delhi': ['Seelampur', 'Jaffrabad', 'Welcome Colony'],
      'North West Delhi': ['Rohini', 'Pitampura', 'Shalimar Bagh', 'Narela'],
      'Shahdara': ['Shahdara', 'Vivek Vihar', 'Anand Vihar'],
      'South Delhi': ['Hauz Khas', 'Defence Colony', 'Mehrauli', 'Saket', 'Greater Kailash'],
      'South East Delhi': ['Okhla', 'Kalkaji', 'Nizamuddin', 'Jangpura'],
      'South West Delhi': ['Dwarka', 'Vasant Kunj', 'Najafgarh', 'Kapashera'],
      'West Delhi': ['Janakpuri', 'Rajouri Garden', 'Tilak Nagar', 'Vikaspuri'],
    }
  },
  'Goa': {
    districts: {
      'North Goa': ['Panaji', 'Mapusa', 'Bicholim', 'Pernem', 'Ponda'],
      'South Goa': ['Margao', 'Vasco da Gama', 'Quepem', 'Sanguem', 'Canacona'],
    }
  },
  'Gujarat': {
    districts: {
      'Ahmedabad': ['Ahmedabad', 'Dhandhuka', 'Sanand', 'Bavla', 'Viramgam'],
      'Amreli': ['Amreli', 'Dhari', 'Savarkundla', 'Rajula'],
      'Anand': ['Anand', 'Petlad', 'Borsad', 'Khambhat'],
      'Banaskantha': ['Palanpur', 'Deesa', 'Dantiwada', 'Tharad'],
      'Bharuch': ['Bharuch', 'Ankleshwar', 'Jambusar', 'Amod'],
      'Bhavnagar': ['Bhavnagar', 'Palitana', 'Sihor', 'Mahuva'],
      'Gandhinagar': ['Gandhinagar', 'Kalol', 'Dehgam', 'Mansa'],
      'Jamnagar': ['Jamnagar', 'Dhrol', 'Lalpur', 'Kalavad'],
      'Junagadh': ['Junagadh', 'Veraval', 'Manavadar', 'Visavadar'],
      'Kutch': ['Bhuj', 'Gandhidham', 'Anjar', 'Mandvi', 'Mundra'],
      'Mehsana': ['Mehsana', 'Visnagar', 'Kadi', 'Unjha'],
      'Panchmahal': ['Godhra', 'Halol', 'Kalol', 'Morva Hadaf'],
      'Rajkot': ['Rajkot', 'Gondal', 'Jetpur', 'Dhoraji', 'Morbi'],
      'Surat': ['Surat', 'Bardoli', 'Mandvi', 'Olpad', 'Kamrej'],
      'Vadodara': ['Vadodara', 'Karjan', 'Padra', 'Dabhoi', 'Savli'],
      'Valsad': ['Valsad', 'Vapi', 'Dharampur', 'Pardi'],
    }
  },
  'Haryana': {
    districts: {
      'Ambala': ['Ambala', 'Ambala Cantt', 'Barara'],
      'Bhiwani': ['Bhiwani', 'Charkhi Dadri'],
      'Faridabad': ['Faridabad', 'Ballabgarh'],
      'Fatehabad': ['Fatehabad', 'Tohana', 'Ratia'],
      'Gurugram': ['Gurugram', 'Sohna', 'Pataudi', 'Farukhnagar'],
      'Hisar': ['Hisar', 'Hansi', 'Barwala', 'Adampur'],
      'Jhajjar': ['Jhajjar', 'Bahadurgarh', 'Beri'],
      'Jind': ['Jind', 'Narwana', 'Safidon', 'Julana'],
      'Karnal': ['Karnal', 'Panipat', 'Nilokheri', 'Gharaunda'],
      'Kurukshetra': ['Kurukshetra', 'Thanesar', 'Pehowa', 'Shahabad'],
      'Panchkula': ['Panchkula', 'Kalka', 'Barwala'],
      'Rewari': ['Rewari', 'Dharuhera', 'Kosli'],
      'Rohtak': ['Rohtak', 'Meham', 'Kalanaur'],
      'Sonipat': ['Sonipat', 'Ganaur', 'Gohana', 'Kharkhoda'],
      'Yamunanagar': ['Yamunanagar', 'Jagadhri', 'Radaur', 'Bilaspur'],
    }
  },
  'Himachal Pradesh': {
    districts: {
      'Bilaspur': ['Bilaspur', 'Ghumarwin', 'Naina Devi'],
      'Chamba': ['Chamba', 'Dalhousie', 'Bharmour'],
      'Hamirpur': ['Hamirpur', 'Nadaun', 'Sujanpur'],
      'Kangra': ['Dharamshala', 'Kangra', 'Palampur', 'Baijnath'],
      'Kullu': ['Kullu', 'Manali', 'Bhuntar', 'Banjar'],
      'Mandi': ['Mandi', 'Sundernagar', 'Jogindernagar'],
      'Shimla': ['Shimla', 'Solan', 'Rampur Bushahr', 'Theog', 'Kufri'],
      'Sirmaur': ['Nahan', 'Paonta Sahib', 'Rajgarh'],
      'Una': ['Una', 'Ropar', 'Amb'],
    }
  },
  'Jharkhand': {
    districts: {
      'Bokaro': ['Bokaro Steel City', 'Chas', 'Phusro'],
      'Deoghar': ['Deoghar', 'Madhupur', 'Jasidih'],
      'Dhanbad': ['Dhanbad', 'Jharia', 'Sindri', 'Katras'],
      'Dumka': ['Dumka', 'Saraiyahat', 'Jamtara'],
      'East Singhbhum': ['Jamshedpur', 'Jugsalai', 'Adityapur', 'Mango'],
      'Giridih': ['Giridih', 'Bengabad'],
      'Godda': ['Godda', 'Mahagama'],
      'Gumla': ['Gumla', 'Chainpur'],
      'Hazaribag': ['Hazaribag', 'Barhi', 'Ichak'],
      'Palamu': ['Daltonganj', 'Medininagar'],
      'Ranchi': ['Ranchi', 'Hatia', 'Namkum', 'Kanke', 'Ratu'],
      'West Singhbhum': ['Chaibasa', 'Chakradharpur'],
    }
  },
  'Karnataka': {
    districts: {
      'Bagalkot': ['Bagalkot', 'Badami', 'Jamkhandi', 'Mudhol'],
      'Ballari': ['Ballari', 'Hospet', 'Sandur', 'Siruguppa'],
      'Bengaluru Urban': ['Bengaluru', 'Yelahanka', 'Anekal', 'Electronic City'],
      'Bengaluru Rural': ['Devanahalli', 'Doddaballapur', 'Hoskote', 'Nelamangala'],
      'Belagavi': ['Belagavi', 'Belgaum', 'Gokak', 'Athani', 'Chikkodi'],
      'Dakshina Kannada': ['Mangaluru', 'Puttur', 'Bantwal', 'Sullia'],
      'Davanagere': ['Davanagere', 'Harihar', 'Channagiri'],
      'Dharwad': ['Dharwad', 'Hubli', 'Navalgund', 'Kundgol'],
      'Gulbarga': ['Kalaburagi', 'Gulbarga', 'Aland', 'Chincholi'],
      'Hassan': ['Hassan', 'Channarayapatna', 'Arsikere', 'Belur'],
      'Mandya': ['Mandya', 'Maddur', 'Srirangapatna', 'Nagamangala'],
      'Mysuru': ['Mysuru', 'Mysore', 'Nanjangud', 'Hunsur', 'T Narasipura'],
      'Raichur': ['Raichur', 'Sindhanur', 'Manvi', 'Devadurga'],
      'Shimoga': ['Shimoga', 'Bhadravati', 'Sagar', 'Tirthahalli'],
      'Tumkur': ['Tumkur', 'Tiptur', 'Sira', 'Gubbi'],
      'Udupi': ['Udupi', 'Kundapura', 'Karkala'],
      'Uttara Kannada': ['Karwar', 'Sirsi', 'Dandeli', 'Honnavar'],
    }
  },
  'Kerala': {
    districts: {
      'Alappuzha': ['Alappuzha', 'Ambalappuzha', 'Cherthala', 'Kayamkulam'],
      'Ernakulam': ['Kochi', 'Ernakulam', 'Aluva', 'Angamaly', 'Perumbavoor'],
      'Idukki': ['Idukki', 'Munnar', 'Thodupuzha', 'Adimali'],
      'Kannur': ['Kannur', 'Thalassery', 'Payyanur', 'Mattannur'],
      'Kasaragod': ['Kasaragod', 'Kanhangad'],
      'Kollam': ['Kollam', 'Punalur', 'Karunagappally'],
      'Kottayam': ['Kottayam', 'Pala', 'Changanassery', 'Vaikom'],
      'Kozhikode': ['Kozhikode', 'Calicut', 'Vadakara', 'Koyilandy'],
      'Malappuram': ['Malappuram', 'Manjeri', 'Tirur', 'Ponnani'],
      'Palakkad': ['Palakkad', 'Ottapalam', 'Shornur', 'Chittur'],
      'Pathanamthitta': ['Pathanamthitta', 'Adoor', 'Thiruvalla'],
      'Thiruvananthapuram': ['Thiruvananthapuram', 'Neyyattinkara', 'Attingal', 'Nedumangad'],
      'Thrissur': ['Thrissur', 'Chalakudy', 'Irinjalakuda', 'Kodungallur'],
      'Wayanad': ['Kalpetta', 'Mananthavady', 'Sultan Bathery'],
    }
  },
  'Madhya Pradesh': {
    districts: {
      'Agar Malwa': ['Agar', 'Susner'],
      'Alirajpur': ['Alirajpur', 'Jobat'],
      'Anuppur': ['Anuppur', 'Pushprajgarh'],
      'Ashoknagar': ['Ashoknagar', 'Chanderi', 'Isagarh'],
      'Balaghat': ['Balaghat', 'Waraseoni', 'Katangi'],
      'Barwani': ['Barwani', 'Sendhwa', 'Rajpur'],
      'Betul': ['Betul', 'Multai', 'Bhainsdehi'],
      'Bhind': ['Bhind', 'Mehgaon', 'Lahar'],
      'Bhopal': ['Bhopal', 'Berasia', 'Huzur'],
      'Burhanpur': ['Burhanpur'],
      'Chhatarpur': ['Chhatarpur', 'Nowgong', 'Khajuraho'],
      'Chhindwara': ['Chhindwara', 'Seoni Malwa', 'Pandhurna', 'Amarwara'],
      'Damoh': ['Damoh', 'Hatta', 'Patharia'],
      'Datia': ['Datia', 'Bhander', 'Seondha'],
      'Dewas': ['Dewas', 'Bagli', 'Sonkatch', 'Tonk Khurd'],
      'Dhar': ['Dhar', 'Manawar', 'Kukshi', 'Dharampuri'],
      'Dindori': ['Dindori', 'Amarkantak', 'Shahpura'],
      'Guna': ['Guna', 'Raghogarh', 'Aron'],
      'Gwalior': ['Gwalior', 'Dabra', 'Bhitarwar'],
      'Harda': ['Harda', 'Timarni', 'Khirkiya'],
      'Hoshangabad': ['Hoshangabad', 'Itarsi', 'Sohagpur', 'Pipariya'],
      'Indore': ['Indore', 'Mhow', 'Depalpur', 'Sanwer', 'Rau', 'Pithampur'],
      'Jabalpur': ['Jabalpur', 'Katni', 'Sihora', 'Patan', 'Shahpura'],
      'Jhabua': ['Jhabua', 'Petlawad', 'Ranapur'],
      'Katni': ['Katni', 'Vijayraghavgarh', 'Bahoriband'],
      'Khandwa': ['Khandwa', 'Khalwa', 'Pandhana'],
      'Khargone': ['Khargone', 'Maheshwar', 'Kasrawad'],
      'Mandla': ['Mandla', 'Nainpur', 'Niwas'],
      'Mandsaur': ['Mandsaur', 'Neemuch', 'Garoth'],
      'Morena': ['Morena', 'Ambah', 'Porsa', 'Joura'],
      'Narsinghpur': ['Narsinghpur', 'Gadarwara', 'Gotegaon'],
      'Neemuch': ['Neemuch', 'Manasa', 'Jawad'],
      'Panna': ['Panna', 'Ajaigarh', 'Pawai'],
      'Raisen': ['Raisen', 'Gairatganj', 'Begamganj', 'Silwani'],
      'Rajgarh': ['Rajgarh', 'Biaora', 'Khilchipur', 'Sarangpur'],
      'Ratlam': ['Ratlam', 'Jaora', 'Sailana', 'Alot'],
      'Rewa': ['Rewa', 'Sirmour', 'Hanumana', 'Mauganj'],
      'Sagar': ['Sagar', 'Khurai', 'Bina', 'Banda'],
      'Satna': ['Satna', 'Maihar', 'Amarpatan', 'Nagod'],
      'Sehore': ['Sehore', 'Ashta', 'Ichhawar', 'Budni'],
      'Seoni': ['Seoni', 'Barghat', 'Lakhnadon'],
      'Shahdol': ['Shahdol', 'Umaria', 'Beohari'],
      'Shajapur': ['Shajapur', 'Shujalpur', 'Maksi'],
      'Sheopur': ['Sheopur', 'Vijaypur'],
      'Shivpuri': ['Shivpuri', 'Pohari', 'Karera', 'Pichhore'],
      'Sidhi': ['Sidhi', 'Churhat'],
      'Singrauli': ['Singrauli', 'Waidhan', 'Deosar'],
      'Tikamgarh': ['Tikamgarh', 'Niwari', 'Prithvipur'],
      'Ujjain': ['Ujjain', 'Nagda', 'Barnagar', 'Mahidpur', 'Tarana'],
      'Umaria': ['Umaria', 'Bandhogarh'],
      'Vidisha': ['Vidisha', 'Basoda', 'Gyaraspur', 'Nateran'],
    }
  },
  'Maharashtra': {
    districts: {
      'Ahmednagar': ['Ahmednagar', 'Shrirampur', 'Sangamner', 'Kopargaon'],
      'Akola': ['Akola', 'Murtizapur', 'Balapur'],
      'Amravati': ['Amravati', 'Achalpur', 'Paratwada'],
      'Aurangabad': ['Aurangabad', 'Vaijapur', 'Gangapur', 'Paithan'],
      'Beed': ['Beed', 'Ambajogai', 'Georai'],
      'Bhandara': ['Bhandara', 'Tumsar', 'Pauni'],
      'Chandrapur': ['Chandrapur', 'Warora', 'Ballarpur'],
      'Jalgaon': ['Jalgaon', 'Bhusawal', 'Amalner', 'Pachora'],
      'Kolhapur': ['Kolhapur', 'Ichalkaranji', 'Jaysingpur', 'Gadhinglaj'],
      'Latur': ['Latur', 'Udgir', 'Nilanga'],
      'Mumbai City': ['Mumbai', 'Colaba', 'Fort', 'Byculla', 'Dadar'],
      'Mumbai Suburban': ['Andheri', 'Borivali', 'Malad', 'Goregaon', 'Bandra'],
      'Nagpur': ['Nagpur', 'Kamptee', 'Ramtek', 'Umred'],
      'Nanded': ['Nanded', 'Deglur', 'Kinwat'],
      'Nashik': ['Nashik', 'Malegaon', 'Sinnar', 'Igatpuri', 'Niphad'],
      'Osmanabad': ['Osmanabad', 'Tuljapur', 'Bhoom'],
      'Palghar': ['Palghar', 'Vasai', 'Virar', 'Dahanu', 'Boisar'],
      'Pune': ['Pune', 'Pimpri-Chinchwad', 'Baramati', 'Junnar', 'Shirur', 'Lonavala'],
      'Raigad': ['Alibag', 'Panvel', 'Uran', 'Karjat', 'Mahad'],
      'Ratnagiri': ['Ratnagiri', 'Chiplun', 'Dapoli'],
      'Sangli': ['Sangli', 'Miraj', 'Vita', 'Tasgaon'],
      'Satara': ['Satara', 'Karad', 'Wai', 'Mahabaleshwar'],
      'Sindhudurg': ['Sindhudurg', 'Kudal', 'Sawantwadi', 'Malvan'],
      'Solapur': ['Solapur', 'Pandharpur', 'Barsi', 'Karmala'],
      'Thane': ['Thane', 'Kalyan', 'Dombivli', 'Ulhasnagar', 'Bhiwandi', 'Mira-Bhayandar'],
      'Wardha': ['Wardha', 'Hinganghat', 'Pulgaon'],
      'Washim': ['Washim', 'Malegaon'],
      'Yavatmal': ['Yavatmal', 'Pusad', 'Darwha'],
    }
  },
  'Manipur': {
    districts: {
      'Bishnupur': ['Bishnupur'],
      'Imphal East': ['Imphal'],
      'Imphal West': ['Imphal', 'Lamphelpat'],
      'Thoubal': ['Thoubal', 'Kakching'],
    }
  },
  'Meghalaya': {
    districts: {
      'East Khasi Hills': ['Shillong', 'Nongpoh'],
      'West Garo Hills': ['Tura', 'Phulbari'],
      'West Khasi Hills': ['Nongstoin'],
      'Ri Bhoi': ['Nongpoh'],
    }
  },
  'Mizoram': {
    districts: {
      'Aizawl': ['Aizawl'],
      'Lunglei': ['Lunglei'],
      'Champhai': ['Champhai'],
    }
  },
  'Nagaland': {
    districts: {
      'Kohima': ['Kohima'],
      'Dimapur': ['Dimapur'],
      'Mokokchung': ['Mokokchung'],
      'Tuensang': ['Tuensang'],
    }
  },
  'Odisha': {
    districts: {
      'Angul': ['Angul', 'Talcher'],
      'Balasore': ['Balasore', 'Jaleswar', 'Soro'],
      'Berhampur': ['Berhampur', 'Chhatrapur'],
      'Bhubaneswar': ['Bhubaneswar', 'Cuttack'],
      'Cuttack': ['Cuttack', 'Choudwar', 'Banki'],
      'Ganjam': ['Berhampur', 'Chhatrapur', 'Aska'],
      'Jharsuguda': ['Jharsuguda', 'Belpahar'],
      'Kendujhar': ['Kendujhar', 'Barbil', 'Joda'],
      'Khordha': ['Bhubaneswar', 'Khordha', 'Jatni'],
      'Koraput': ['Koraput', 'Jeypore'],
      'Mayurbhanj': ['Baripada', 'Rairangpur'],
      'Puri': ['Puri', 'Konark', 'Pipili'],
      'Rourkela': ['Rourkela', 'Rajgangpur'],
      'Sambalpur': ['Sambalpur', 'Burla', 'Hirakud'],
      'Sundargarh': ['Sundargarh', 'Rourkela', 'Rajgangpur'],
    }
  },
  'Punjab': {
    districts: {
      'Amritsar': ['Amritsar', 'Ajnala', 'Baba Bakala'],
      'Barnala': ['Barnala', 'Tapa'],
      'Bathinda': ['Bathinda', 'Rampura Phul', 'Maur'],
      'Faridkot': ['Faridkot', 'Kotkapura'],
      'Fatehgarh Sahib': ['Fatehgarh Sahib', 'Bassi Pathana'],
      'Fazilka': ['Fazilka', 'Abohar'],
      'Firozpur': ['Firozpur', 'Zira'],
      'Gurdaspur': ['Gurdaspur', 'Batala', 'Pathankot', 'Dinanagar'],
      'Hoshiarpur': ['Hoshiarpur', 'Mukerian', 'Dasuya', 'Garh Shankar'],
      'Jalandhar': ['Jalandhar', 'Phagwara', 'Nakodar', 'Kartarpur'],
      'Kapurthala': ['Kapurthala', 'Phagwara', 'Sultanpur Lodhi'],
      'Ludhiana': ['Ludhiana', 'Khanna', 'Samrala', 'Jagraon', 'Raikot'],
      'Moga': ['Moga', 'Nihal Singh Wala'],
      'Mohali': ['Mohali', 'Kharar', 'Dera Bassi', 'Zirakpur'],
      'Patiala': ['Patiala', 'Rajpura', 'Nabha', 'Samana'],
      'Rupnagar': ['Rupnagar', 'Morinda', 'Nangal'],
      'Sangrur': ['Sangrur', 'Malerkotla', 'Dhuri', 'Sunam'],
      'Tarn Taran': ['Tarn Taran', 'Patti'],
    }
  },
  'Rajasthan': {
    districts: {
      'Ajmer': ['Ajmer', 'Beawar', 'Kishangarh', 'Pushkar', 'Nasirabad'],
      'Alwar': ['Alwar', 'Bhiwadi', 'Tijara', 'Behror', 'Rajgarh'],
      'Banswara': ['Banswara', 'Kushalgarh'],
      'Baran': ['Baran', 'Atru', 'Chhipa Barod'],
      'Barmer': ['Barmer', 'Balotra', 'Siwana'],
      'Bharatpur': ['Bharatpur', 'Deeg', 'Bayana', 'Weir'],
      'Bhilwara': ['Bhilwara', 'Gangapur', 'Gulabpura', 'Shahpura'],
      'Bikaner': ['Bikaner', 'Nokha', 'Lunkaransar'],
      'Bundi': ['Bundi', 'Keshoraipatan', 'Nainwan'],
      'Chittorgarh': ['Chittorgarh', 'Nimbahera', 'Begun'],
      'Churu': ['Churu', 'Ratangarh', 'Sujangarh'],
      'Dausa': ['Dausa', 'Lalsot', 'Sikrai'],
      'Dholpur': ['Dholpur', 'Bari', 'Rajakhera'],
      'Dungarpur': ['Dungarpur', 'Sagwara'],
      'Hanumangarh': ['Hanumangarh', 'Nohar', 'Pilibanga'],
      'Jaipur': ['Jaipur', 'Amber', 'Chomu', 'Sanganer', 'Shahpura', 'Vidhyadhar Nagar'],
      'Jaisalmer': ['Jaisalmer', 'Pokaran'],
      'Jalore': ['Jalore', 'Sanchore', 'Ahore'],
      'Jhalawar': ['Jhalawar', 'Jhalrapatan'],
      'Jhunjhunu': ['Jhunjhunu', 'Chirawa', 'Pilani', 'Nawalgarh'],
      'Jodhpur': ['Jodhpur', 'Pali', 'Pipar City', 'Osian', 'Bilara'],
      'Karauli': ['Karauli', 'Hindaun', 'Todabhim'],
      'Kota': ['Kota', 'Ramganj Mandi', 'Sangod'],
      'Nagaur': ['Nagaur', 'Didwana', 'Degana', 'Parbatsar'],
      'Pali': ['Pali', 'Marwar Junction', 'Sojat', 'Jaitaran'],
      'Pratapgarh': ['Pratapgarh', 'Arnod'],
      'Rajsamand': ['Rajsamand', 'Nathdwara', 'Kankroli'],
      'Sawai Madhopur': ['Sawai Madhopur', 'Gangapur City'],
      'Sikar': ['Sikar', 'Fatehpur', 'Lachhmangarh', 'Neem Ka Thana'],
      'Sirohi': ['Sirohi', 'Abu Road', 'Mount Abu'],
      'Sri Ganganagar': ['Sri Ganganagar', 'Suratgarh', 'Karanpur'],
      'Tonk': ['Tonk', 'Deoli', 'Uniara'],
      'Udaipur': ['Udaipur', 'Salumber', 'Sarada', 'Gogunda'],
    }
  },
  'Sikkim': {
    districts: {
      'East Sikkim': ['Gangtok', 'Singtam', 'Rangpo'],
      'West Sikkim': ['Geyzing', 'Pelling'],
      'North Sikkim': ['Mangan', 'Lachung'],
      'South Sikkim': ['Namchi', 'Ravangla'],
    }
  },
  'Tamil Nadu': {
    districts: {
      'Chennai': ['Chennai', 'Tambaram', 'Avadi', 'Ambattur', 'Porur'],
      'Coimbatore': ['Coimbatore', 'Pollachi', 'Mettupalayam', 'Sulur'],
      'Cuddalore': ['Cuddalore', 'Chidambaram', 'Neyveli', 'Virudhachalam'],
      'Dharmapuri': ['Dharmapuri', 'Palacode', 'Pennagaram'],
      'Dindigul': ['Dindigul', 'Palani', 'Natham', 'Oddanchatram'],
      'Erode': ['Erode', 'Bhavani', 'Gobichettipalayam', 'Sathyamangalam'],
      'Kancheepuram': ['Kancheepuram', 'Sriperumbudur', 'Chengalpattu'],
      'Karur': ['Karur', 'Kulithalai'],
      'Madurai': ['Madurai', 'Melur', 'Usilampatti', 'Tirumangalam'],
      'Nagapattinam': ['Nagapattinam', 'Mayiladuthurai', 'Sirkazhi'],
      'Namakkal': ['Namakkal', 'Rasipuram', 'Tiruchengode'],
      'Salem': ['Salem', 'Attur', 'Mettur', 'Omalur'],
      'Thanjavur': ['Thanjavur', 'Kumbakonam', 'Pattukkottai'],
      'Tiruchirappalli': ['Tiruchirappalli', 'Srirangam', 'Lalgudi', 'Musiri'],
      'Tirunelveli': ['Tirunelveli', 'Ambasamudram', 'Tenkasi'],
      'Tiruppur': ['Tiruppur', 'Avinashi', 'Udumalpet', 'Dharapuram'],
      'Vellore': ['Vellore', 'Ranipet', 'Ambur', 'Arcot', 'Vaniyambadi'],
      'Villupuram': ['Villupuram', 'Tindivanam', 'Gingee'],
    }
  },
  'Telangana': {
    districts: {
      'Adilabad': ['Adilabad', 'Mancherial', 'Nirmal'],
      'Hyderabad': ['Hyderabad', 'Secunderabad', 'Begumpet', 'Ameerpet'],
      'Karimnagar': ['Karimnagar', 'Ramagundam', 'Peddapalli'],
      'Khammam': ['Khammam', 'Kothagudem', 'Bhadrachalam'],
      'Mahabubnagar': ['Mahabubnagar', 'Jadcherla', 'Nagarkurnool'],
      'Medak': ['Medak', 'Siddipet', 'Sangareddy'],
      'Nalgonda': ['Nalgonda', 'Suryapet', 'Miryalaguda'],
      'Nizamabad': ['Nizamabad', 'Bodhan', 'Kamareddy'],
      'Rangareddy': ['Shamshabad', 'Chevella', 'Vikarabad', 'Tandur'],
      'Sangareddy': ['Sangareddy', 'Zaheerabad', 'Narayankhed'],
      'Warangal': ['Warangal', 'Hanamkonda', 'Jangaon'],
    }
  },
  'Tripura': {
    districts: {
      'West Tripura': ['Agartala', 'Bishalgarh', 'Khowai'],
      'South Tripura': ['Udaipur', 'Belonia', 'Sabroom'],
      'North Tripura': ['Dharmanagar', 'Kailashahar'],
      'Dhalai': ['Ambassa', 'Kamalpur'],
    }
  },
  'Uttar Pradesh': {
    districts: {
      'Agra': ['Agra', 'Fatehpur Sikri', 'Firozabad', 'Etmadpur'],
      'Aligarh': ['Aligarh', 'Khair', 'Atrauli', 'Iglas'],
      'Allahabad': ['Prayagraj', 'Allahabad', 'Phulpur', 'Handia'],
      'Ambedkar Nagar': ['Akbarpur', 'Tanda', 'Jalalpur'],
      'Auraiya': ['Auraiya', 'Bidhuna'],
      'Azamgarh': ['Azamgarh', 'Phulpur', 'Sagri'],
      'Baghpat': ['Baghpat', 'Baraut', 'Khekada'],
      'Bahraich': ['Bahraich', 'Nanpara', 'Kaiserganj'],
      'Ballia': ['Ballia', 'Rasra', 'Bansdih'],
      'Bareilly': ['Bareilly', 'Fatehganj', 'Nawabganj', 'Aonla'],
      'Basti': ['Basti', 'Harraiya'],
      'Bulandshahr': ['Bulandshahr', 'Khurja', 'Sikandrabad', 'Anupshahr'],
      'Chandauli': ['Chandauli', 'Mughalsarai'],
      'Deoria': ['Deoria', 'Bhatpar Rani', 'Salempur'],
      'Etawah': ['Etawah', 'Bharthana'],
      'Faizabad': ['Faizabad', 'Ayodhya', 'Tanda'],
      'Farrukhabad': ['Farrukhabad', 'Fatehgarh', 'Kaimganj'],
      'Fatehpur': ['Fatehpur', 'Bindki', 'Khaga'],
      'Ghaziabad': ['Ghaziabad', 'Modinagar', 'Muradnagar', 'Loni'],
      'Ghazipur': ['Ghazipur', 'Mohammadabad', 'Saidpur'],
      'Gonda': ['Gonda', 'Nawabganj', 'Colonelganj'],
      'Gorakhpur': ['Gorakhpur', 'Sahjanwa', 'Chauri Chaura', 'Gida'],
      'Hamirpur': ['Hamirpur', 'Rath', 'Maudaha'],
      'Hardoi': ['Hardoi', 'Sandila', 'Shahabad'],
      'Jalaun': ['Orai', 'Jalaun', 'Konch'],
      'Jaunpur': ['Jaunpur', 'Machhli Shahar', 'Shahganj'],
      'Jhansi': ['Jhansi', 'Lalitpur', 'Mauranipur', 'Moth'],
      'Kannauj': ['Kannauj', 'Chhibramau'],
      'Kanpur Dehat': ['Kanpur Dehat', 'Akbarpur', 'Rasulabad'],
      'Kanpur Nagar': ['Kanpur', 'Bithoor', 'Govind Nagar'],
      'Kushinagar': ['Kushinagar', 'Padrauna', 'Khadda'],
      'Lakhimpur Kheri': ['Lakhimpur', 'Kheri', 'Gola Gokarannath'],
      'Lucknow': ['Lucknow', 'Mohanlalganj', 'Chinhat', 'Malihabad'],
      'Maharajganj': ['Maharajganj', 'Nautanwa', 'Pharenda'],
      'Mainpuri': ['Mainpuri', 'Bhongaon', 'Shikohabad'],
      'Mathura': ['Mathura', 'Vrindavan', 'Chhata', 'Govardhan'],
      'Meerut': ['Meerut', 'Hapur', 'Sardhana', 'Mawana'],
      'Mirzapur': ['Mirzapur', 'Chunar', 'Lalganj'],
      'Moradabad': ['Moradabad', 'Sambhal', 'Chandausi'],
      'Muzaffarnagar': ['Muzaffarnagar', 'Shamli', 'Kairana'],
      'Noida': ['Noida', 'Greater Noida', 'Dadri'],
      'Pilibhit': ['Pilibhit', 'Bisalpur', 'Puranpur'],
      'Pratapgarh': ['Pratapgarh', 'Kunda'],
      'Raebareli': ['Raebareli', 'Lalganj', 'Salon'],
      'Rampur': ['Rampur', 'Suar', 'Bilaspur'],
      'Saharanpur': ['Saharanpur', 'Deoband', 'Behat', 'Gangoh'],
      'Shahjahanpur': ['Shahjahanpur', 'Tilhar', 'Jalalabad'],
      'Sitapur': ['Sitapur', 'Biswan', 'Misrikh'],
      'Sultanpur': ['Sultanpur', 'Amethi', 'Musafirkhana'],
      'Unnao': ['Unnao', 'Shuklaganj', 'Hasanganj'],
      'Varanasi': ['Varanasi', 'Banaras', 'Ramnagar', 'Sarnath'],
    }
  },
  'Uttarakhand': {
    districts: {
      'Almora': ['Almora', 'Ranikhet', 'Bhikiyasain'],
      'Chamoli': ['Chamoli', 'Joshimath', 'Gopeshwar'],
      'Dehradun': ['Dehradun', 'Mussoorie', 'Rishikesh', 'Doiwala', 'Vikasnagar'],
      'Haridwar': ['Haridwar', 'Roorkee', 'Laksar', 'Manglaur'],
      'Nainital': ['Nainital', 'Haldwani', 'Ramnagar', 'Bhowali'],
      'Pauri Garhwal': ['Pauri', 'Kotdwar', 'Srinagar'],
      'Pithoragarh': ['Pithoragarh', 'Champawat', 'Dharchula'],
      'Tehri Garhwal': ['Tehri', 'New Tehri', 'Chamba'],
      'Udham Singh Nagar': ['Rudrapur', 'Kashipur', 'Bazpur', 'Jaspur'],
      'Uttarkashi': ['Uttarkashi', 'Gangotri'],
    }
  },
  'West Bengal': {
    districts: {
      'Bankura': ['Bankura', 'Bishnupur', 'Sonamukhi'],
      'Bardhaman': ['Bardhaman', 'Durgapur', 'Asansol', 'Kulti'],
      'Birbhum': ['Suri', 'Bolpur', 'Rampurhat'],
      'Cooch Behar': ['Cooch Behar', 'Dinhata', 'Tufanganj'],
      'Darjeeling': ['Darjeeling', 'Siliguri', 'Kurseong', 'Mirik'],
      'Hooghly': ['Hooghly', 'Chandannagar', 'Serampore', 'Chinsurah'],
      'Howrah': ['Howrah', 'Uluberia', 'Domjur'],
      'Jalpaiguri': ['Jalpaiguri', 'Alipurduar', 'Malbazar'],
      'Kolkata': ['Kolkata', 'Salt Lake', 'New Town', 'Howrah'],
      'Malda': ['Malda', 'English Bazar', 'Old Malda'],
      'Medinipur East': ['Tamluk', 'Haldia', 'Contai'],
      'Medinipur West': ['Medinipur', 'Kharagpur', 'Jhargram'],
      'Murshidabad': ['Murshidabad', 'Berhampore', 'Lalbag', 'Jiaganj'],
      'Nadia': ['Krishnanagar', 'Nabadwip', 'Ranaghat', 'Kalyani'],
      'North 24 Parganas': ['Barrackpore', 'Barasat', 'Dum Dum', 'Titagarh'],
      'Purulia': ['Purulia', 'Raghunathpur'],
      'South 24 Parganas': ['Baruipur', 'Kakdwip', 'Diamond Harbour', 'Canning'],
    }
  },
}

// Helper to get sorted state names
export function getStateNames(): string[] {
  return Object.keys(INDIAN_STATES).sort()
}

// Helper to get districts for a state
export function getDistrictsForState(state: string): string[] {
  const stateData = INDIAN_STATES[state]
  if (!stateData) return []
  return Object.keys(stateData.districts).sort()
}

// Helper to get cities for a state + district
export function getCitiesForDistrict(state: string, district: string): string[] {
  const stateData = INDIAN_STATES[state]
  if (!stateData) return []
  return stateData.districts[district] || []
}

// ── Tehsils & Police Stations (Simulated hierarchical data) ──
// For production, this should be fetched from an API or a larger DB
export function getTehsilsForDistrict(state: string, district: string): string[] {
  if (!district) return []
  
  // Real Tehsils for major districts
  if (state === 'Madhya Pradesh') {
    if (district === 'Indore') return ['Indore City', 'Indore Moffusil', 'Mhow', 'Depalpur', 'Sanwer', 'Hatod']
    if (district === 'Bhopal') return ['Huzur', 'Berasia', 'Kolar']
    if (district === 'Ujjain') return ['Ujjain City', 'Ghatiya', 'Khachrod', 'Nagda', 'Mahidpur', 'Tarana', 'Badnagar']
    if (district === 'Gwalior') return ['Gwalior City', 'Dabra', 'Bhitarwar', 'Chinour']
    if (district === 'Jabalpur') return ['Jabalpur City', 'Sihora', 'Patan', 'Panagar', 'Kundam']
  }
  if (state === 'Delhi') {
    return ['Chanakyapuri', 'Vasant Vihar', 'Connaught Place', 'Parliament Street', 'Hauz Khas', 'Defence Colony', 'Kalkaji', 'Punjabi Bagh', 'Rajouri Garden']
  }
  
  // Smart fallback for ANY district in India to guarantee dropdown options
  return [
    `${district} Central`, 
    `${district} North`, 
    `${district} South`, 
    `${district} East`, 
    `${district} West`, 
    `${district} Rural`
  ]
}

export function getPoliceStationsForTehsil(tehsil: string): string[] {
  if (!tehsil) return []
  
  // Real Police Stations for major Tehsils
  if (tehsil === 'Indore City') {
    return [
      'Aerodrome PS', 'Annapurna PS', 'Banganga PS', 'Bhanwarkuan PS', 'Central Kotwali PS', 
      'Chandan Nagar PS', 'Chhatripura PS', 'Dwarkapuri PS', 'Heera Nagar PS', 'Juni Indore PS', 
      'Kanadia PS', 'Khajrana PS', 'Lasudia PS', 'LIG Square PS', 'Malharganj PS', 'MG Road PS', 
      'MIG PS', 'Palasia PS', 'Pandrinath PS', 'Pardeshipura PS', 'Rajendra Nagar PS', 'Rau PS', 
      'Sadar Bazar PS', 'Sanyogitaganj PS', 'Sarafa PS', 'Tejaji Nagar PS', 'Tilak Nagar PS', 
      'Tukoganj PS', 'Vijay Nagar PS'
    ].sort()
  }
  if (tehsil === 'Mhow' || tehsil === 'Indore Moffusil') {
    return ['Mhow Cantt PS', 'Kishanganj PS', 'Pithampur PS', 'Manpur PS', 'Badgonda PS'].sort()
  }
  if (tehsil === 'Huzur' || tehsil === 'Bhopal') {
    return ['MP Nagar PS', 'Habibganj PS', 'TT Nagar PS', 'Govindpura PS', 'Piplani PS', 'Ashoka Garden PS', 'Kolar Road PS', 'Misrod PS', 'Chuna Bhatti PS'].sort()
  }
  if (tehsil === 'Gwalior City') {
    return ['Gwalior PS', 'Lashkar PS', 'Morar PS', 'Thatipur PS', 'Hazira PS', 'Padav PS', 'Inderganj PS', 'Gola Ka Mandir PS'].sort()
  }
  if (tehsil === 'Connaught Place' || tehsil === 'Parliament Street') {
    return ['Connaught Place PS', 'Parliament Street PS', 'Barakhamba Road PS', 'Mandir Marg PS', 'Tughlak Road PS'].sort()
  }
  
  // Smart fallback for ANY tehsil in India to guarantee dropdown options
  const baseBase = tehsil.replace(/( Central| North| South| East| West| Rural| City| Moffusil)/gi, '').trim()
  const base = baseBase ? baseBase : tehsil
  
  return [
    `${base} City Kotwali PS`,
    `${base} Civil Lines PS`,
    `${base} Mahila (Women) PS`,
    `${base} Cantt PS`,
    `${base} Sadar PS`,
    `${base} Traffic PS`,
    `${base} Rural PS`,
    `${base} Cyber Cell`
  ]
}

// ── Pincode → Location Lookup ───────────────────────────────

export interface PincodeResult {
  state: string
  district: string
  city: string
  area?: string
  division?: string // Tehsil / Division
}

export async function lookupPincode(pincode: string): Promise<PincodeResult | null> {
  if (!/^\d{6}$/.test(pincode)) return null
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    const data = await res.json()
    if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0]
      return {
        state: po.State,
        district: po.District,
        city: po.Block || po.Region || po.Name,
        area: po.Name,
        division: po.Division || po.Circle || '',
      }
    }
  } catch (e) {
    console.error('Pincode lookup failed:', e)
  }
  return null
}

// ── Gender Options ──────────────────────────────────────────
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

// ── ID Proof Types ──────────────────────────────────────────
export const ID_PROOF_TYPES = [
  { value: 'aadhar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'voter_id', label: 'Voter ID Card' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'passport', label: 'Passport' },
  { value: 'ration_card', label: 'Ration Card' },
]

// ── ID Validation Rules (per type) ──────────────────────────
export interface IdValidationRule {
  pattern: RegExp
  placeholder: string
  maxLength: number
  label: string
  hint: string
  mask?: string
}

export const ID_VALIDATION_RULES: Record<string, IdValidationRule> = {
  aadhar: {
    pattern: /^\d{12}$/,
    placeholder: 'XXXX XXXX XXXX',
    maxLength: 12,
    label: 'Aadhaar Number',
    hint: '12-digit Aadhaar number',
  },
  pan: {
    pattern: /^[A-Z]{5}\d{4}[A-Z]$/,
    placeholder: 'ABCDE1234F',
    maxLength: 10,
    label: 'PAN Number',
    hint: 'Format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)',
  },
  voter_id: {
    pattern: /^[A-Z]{3}\d{7}$/,
    placeholder: 'ABC1234567',
    maxLength: 10,
    label: 'Voter ID (EPIC No.)',
    hint: '3 letters + 7 digits (e.g. ABC1234567)',
  },
  driving_license: {
    pattern: /^[A-Z]{2}\d{2}\s?\d{11}$/,
    placeholder: 'MH12 20230001234',
    maxLength: 16,
    label: 'Driving License No.',
    hint: 'State code + RTO + year + number (e.g. MH12 20230001234)',
  },
  passport: {
    pattern: /^[A-Z]\d{7}$/,
    placeholder: 'A1234567',
    maxLength: 8,
    label: 'Passport Number',
    hint: '1 letter + 7 digits (e.g. A1234567)',
  },
  ration_card: {
    pattern: /^.{5,20}$/,
    placeholder: 'Enter ration card number',
    maxLength: 20,
    label: 'Ration Card No.',
    hint: 'Enter as printed on your ration card',
  },
}

// Validate ID number based on type
export function validateIdNumber(type: string, number: string): string | null {
  if (!type || !number) return null
  const rule = ID_VALIDATION_RULES[type]
  if (!rule) return null
  const cleanNum = number.replace(/\s/g, '').toUpperCase()
  if (!rule.pattern.test(cleanNum)) {
    return `Invalid format. ${rule.hint}`
  }
  return null // valid
}
