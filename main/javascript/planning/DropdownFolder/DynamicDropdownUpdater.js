export default class DynamicDropdownUpdater {
    constructor(hotInstance, data,changeColorHandler) {
        this.hot = hotInstance; 
        this.datajson = data;
        this.changeColorHandler = changeColorHandler;
        this.init();
    }
    init() {
        const columnNames = ['Périmètre', 'Prestation', 'ADMIN', 'STIT', 'Problème', 'Problème MEP', 'Date TP' ];
        const validProps = columnNames.map(name => this.hot.getColHeader().indexOf(name));

        this.hot.addHook('afterChange', (changes, source) => {

            if (source === 'loadData') {
                return; // Don't do anything if the source is loadData
            }
            // Filter the changes to only include those with a 'prop' in validProps
            const filteredChanges = changes.filter(([_, prop]) => validProps.includes(prop));

            // If there are no relevant changes, exit early
            if (filteredChanges.length === 0) {
                return;
            }

            for (let i = 0; i < changes.length; i++) {  // Start loop from i = 0
                const [row, prop, oldVal, newVal] = changes[i];
                this.createFDR(row);
                if (prop === 18 && newVal !== oldVal) {
                     this.CreateDate (row, prop, oldVal, newVal);
                }
                if (prop === 8) {
                    const newDropdownData = this.fetchDropdownValuesForTypo(newVal);
                    if (newDropdownData) {
                        // If we found some new values for the dropdown, update the source
                        this.updateDropdownSource('Typologie', newDropdownData);
                        this.changeColorHandler.applyColor();
                    }
                }
                if (prop === 10) {
                    
                    const newDropdownData = this.fetchDropdownValuesForTP(newVal);
                    if (newDropdownData) {
                        this.updateDropdownSource("Type TP", newDropdownData);
                        this.changeColorHandler.applyColor();

                    } else {
                        console.log("Error fetching dropdown data for Type TP");
                    }
                }
                if (prop === 25) {
                    const newDropdownData = this.fetchDropdownValuesForAdmin(newVal);
                    if (newDropdownData) {
                        this.updateDropdownSource("Nom de l admin", newDropdownData);
                        this.changeColorHandler.applyColor();
                    } else {
                        console.log("Error fetching dropdown data for Nom de l'admin");
                    }
                }
                if (prop === 27) {
                    const newDropdownData = this.fetchDropdownValuesForIntervenantTerrain(newVal);
                    if (newDropdownData && newDropdownData.length) {
                        this.updateDropdownSource('Intervenant Terrain', newDropdownData);
                        this.changeColorHandler.applyColor();
                    }
                }
                if (prop === 48) {
                    const newDropdownData = this.fetchDropdownValuesForCause(newVal);
                    if (newDropdownData) {
                        this.updateDropdownSource("Causes Echecs", newDropdownData);
                        this.changeColorHandler.applyColor();   
                    } else {
                        console.log("No dropdown data found for cause: " + newVal);
                    }
                } else {
                    console.log("No dropdown data found for prop: " + prop);
                }
                if (prop === 56) {
                    const newDropdownData = this.fetchDropdownValuesForCauseMEP(newVal);
                    if (newDropdownData) {
                        this.updateDropdownSource("Causes Echecs (MEP)", newDropdownData);
                        this.changeColorHandler.applyColor();
                    } else {
                        console.log("No dropdown data found for cause: " + newVal);
                    }
                }
                // Change the value of the column Semaine and Mois to be in this form Semain (Sxx) and Mois (Decembre, Janviere, etc)
            }
        });
        
    }

    updateDropdownSource(columnKey, newDropdownData) {
        const column = this.hot.getColHeader().indexOf(columnKey);
        if (column !== -1) {
            const colSettings = this.hot.getSettings().columns[column];
            if (colSettings) {
                colSettings.source = newDropdownData;
                this.hot.updateSettings({ columns: this.hot.getSettings().columns });
            } else {
                throw new Error('Column settings not found.');
            }
        } else {
            throw new Error('Column not found.');
        }
    }
    fetchDropdownValuesForIntervenantTerrain(stitValue) {
        const INTERVENANT_OPTIONS = this.datajson.intmap.Intervenant_Terrain;
        if (INTERVENANT_OPTIONS[stitValue]) {
            return INTERVENANT_OPTIONS[stitValue];
        } else {
            return [];
        }
    }
    fetchDropdownValuesForAdmin(adminValue) {
        const ADMIN_NAMES = this.datajson.admap.Nom_de_l_admin;
        const adminNames = ADMIN_NAMES[adminValue];
        if (adminNames) {
            return adminNames;
        } else {
            return [];
        }
    }
    fetchDropdownValuesForTypo(perimetrevalue) {
        const Typologie = this.datajson.typomap.Typologie;
        return Typologie && perimetrevalue && Typologie[perimetrevalue] || [];
    }
    fetchDropdownValuesForCause(problemevalue){
        const Cause_Echecs = this.datajson.causemap.Causes_Echecs;
        if (!Cause_Echecs) {
            throw new Error("Cause_Echecs not defined");
        }
        return Cause_Echecs[problemevalue] || [];
    }
    fetchDropdownValuesForCauseMEP(problemevalue){
        const Cause_Echecs = this.datajson.causemepmap.Causes_Echecs_MEP;
        if (!Cause_Echecs) {
            throw new Error("Cause_Echecs not defined");
        }
        return Cause_Echecs[problemevalue] || [];
    }
    fetchDropdownValuesForTP(prestationValue){
        const Type_TP = this.datajson.TPmap.Type_TP;
        return Type_TP[prestationValue] || []
    }
    getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      }

    createFDR(row) {
        console.log("createFDR called");
        let A = this.hot.getDataAtCell(row, 3);
        let B = this.hot.getDataAtCell(row, 4);
        let C = this.hot.getDataAtCell(row, 5);
        let D = this.hot.getDataAtCell(row, 6);
        let H = this.hot.getDataAtCell(row, 11);
        let N = this.hot.getDataAtCell(row, 17);
        let G = this.hot.getDataAtCell(row, 9);
        let P = this.hot.getDataAtCell(row, 18);
        if (A !== null) {
            const formattedP = new Date(P).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const result = `[${A}] [ Feuille de route ] - ${H} - [${N} - ${formattedP}] [${G}] [G2R: ${B} - Site: ${C}] [${D}]`;
            this.hot.setDataAtCell(row, 43, result);
        }
    }

    CreateDate(row, prop, oldVal, newVal) {
        try {
            // Manually parse the date
            const [day, month, year] = newVal.split('/');
            const date = new Date(year, month - 1, day);  // Months are 0-indexed in JS
  
            // Get the week number
            const weekNumber = this.getWeekNumber(date);
            const formattedSemaine = 'S' + String(weekNumber).padStart(2, '0');
            this.hot.setDataAtCell(row, 17, formattedSemaine);
  
            // Get the month name
            const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
            const formattedMois = monthNames[date.getMonth()];
            this.hot.setDataAtCell(row, 16, formattedMois);
  
          } catch (error) {
            console.error(error);
          }
    }
}