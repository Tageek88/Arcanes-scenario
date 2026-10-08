// src/components/ModalSondage.jsx
import React, { useState, useEffect } from 'react';
import './ModalSondage.css';

const ModalSondage = ({ sondage, onSauvegarder, onAnnuler }) => {
  const [titre, setTitre] = useState(sondage.titre);
  const [dates, setDates] = useState(sondage.dates);

  useEffect(() => {
    const handleSauvegarder = () => {
      onSauvegarder({ titre, dates });
    };

    const handleAnnuler = () => {
      onAnnuler();
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        handleAnnuler();
      }
    });

    return () => {
      document.removeEventListener('keydown', () => {});
    };
  }, [sondage, onSauvegarder, onAnnuler]);

  const handleChangerTitre = (e) => {
    setTitre(e.target.value);
  };

  const handleAjouterDate = () => {
    setDates([...dates, '']);
  };

  const handleSupprimerDate = (index) => {
    setDates(dates.filter((date, i) => i !== index));
  };

  const handleChangerDate = (index, e) => {
    setDates(dates.map((date, i) => (i === index ? e.target.value : date)));
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Modifier le sondage</h2>
        <form>
          <label>
            Titre :
            <input type="text" value={titre} onChange={handleChangerTitre} />
          </label>
          <label>
            Dates :
            <ul>
              {dates.map((date, index) => (
                <li key={index}>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => handleChangerDate(index, e)}
                  />
                  <button onClick={() => handleSupprimerDate(index)}>Supprimer</button>
                </li>
              ))}
            </ul>
            <button onClick={handleAjouterDate}>Ajouter une date</button>
          </label>
        </form>
        <button onClick={handleSauvegarder}>Enregistrer</button>
        <button onClick={handleAnnuler}>Annuler</button>
      </div>
    </div>
  );
};

export default ModalSondage;