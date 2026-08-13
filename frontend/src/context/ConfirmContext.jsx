import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
    const [request, setRequest] = useState(null); // { message, resolve, isPrompt }
    const [inputValue, setInputValue] = useState('');

    const confirmAction = useCallback((message) => {
        return new Promise((resolve) => {
            setRequest({ message, resolve, isPrompt: false });
        });
    }, []);

    const promptAction = useCallback((message, defaultValue = '') => {
        return new Promise((resolve) => {
            setInputValue(defaultValue);
            setRequest({ message, resolve, isPrompt: true });
        });
    }, []);

    const resolveWith = (result) => {
        request?.resolve(result);
        setRequest(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirmAction, promptAction }}>
            {children}
            {request && (
                <div className="confirm-overlay" onClick={() => resolveWith(request.isPrompt ? null : false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <p>{request.message}</p>
                        {request.isPrompt && (
                            <input
                                type="text"
                                className="confirm-input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') resolveWith(inputValue); }}
                            />
                        )}
                        <div className="confirm-actions">
                            <button className="confirm-btn-cancel" onClick={() => resolveWith(request.isPrompt ? null : false)}>Cancelar</button>
                            <button className="confirm-btn-ok" onClick={() => resolveWith(request.isPrompt ? inputValue : true)}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

ConfirmProvider.propTypes = { children: PropTypes.node.isRequired };
export const useConfirm = () => useContext(ConfirmContext).confirmAction;
export const usePrompt = () => useContext(ConfirmContext).promptAction;
